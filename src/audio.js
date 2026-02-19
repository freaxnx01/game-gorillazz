(function initAudioEngineScope(global) {
    'use strict';

    const MODEL_THRESHOLDS = {
        maxLoadMs: 2500,
        maxGenerateMs: 1000,
        maxMemoryMb: 80,
        minCoherence: 0.45
    };

    const PROFILE_PRESETS = {
        pulse_soft: { cutoff: 1800, attack: 0.01, release: 0.16, gain: 0.42, detune: 0, noiseGain: 0.14 },
        pulse_bright: { cutoff: 3200, attack: 0.004, release: 0.12, gain: 0.48, detune: 5, noiseGain: 0.12 },
        pulse_crunch: { cutoff: 1400, attack: 0.003, release: 0.09, gain: 0.52, detune: 12, noiseGain: 0.16 }
    };
    // Client-only runtime dependencies loaded lazily per browser session.
    const TFJS_CDN_URL = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.7.0/dist/tf.min.js';
    const MAGENTA_CDN_URL = 'https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/dist/magentamusic.js';
    // MusicRNN checkpoint loaded directly in the browser (no server-side inference).
    const MUSIC_RNN_CHECKPOINT = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn';
    const MODEL_LOAD_TIMEOUT_MS = 120000;

    class AudioEngine {
        constructor(options = {}) {
            this.onStatusChange = options.onStatusChange || function noop() {};
            this.onDebug = options.onDebug || function noop() {};
            this.context = null;
            this.masterGain = null;
            this.toneFilter = null;
            this.noiseBuffer = null;
            this.loopData = null;
            this.loopIndex = [];
            this.loopLengthSteps = 0;
            this.currentStep = 0;
            this.nextStepTime = 0;
            this.schedulerId = null;
            this.playing = false;
            this.volume = 0.9;
            this.selectedModel = null;
            this.status = 'idle';
            this.statusDetail = '';
            this.activeSources = new Set();
            this.musicRnnModel = null;
            this.lastThemeFingerprint = null;
            this.lastGeneratedLoop = null;
            this.lastCandidateResults = [];
            this.runtimeLibraryPromise = null;
            this.runtimeSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }

        setStatus(status, detail = '') {
            this.status = status;
            this.statusDetail = detail;
            this.onStatusChange(status, detail);
        }

        ensureContext() {
            if (this.context) {
                return this.context;
            }

            const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
            if (!AudioContextCtor) {
                throw new Error('Web Audio API is not supported in this browser.');
            }

            this.context = new AudioContextCtor();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.toneFilter = this.context.createBiquadFilter();
            this.toneFilter.type = 'lowpass';
            this.toneFilter.frequency.value = 1900;
            this.toneFilter.Q.value = 0.8;

            this.toneFilter.connect(this.masterGain);
            this.masterGain.connect(this.context.destination);
            return this.context;
        }

        async resumeFromGesture() {
            this.ensureContext();
            if (this.context.state !== 'running') {
                await this.context.resume();
            }
        }

        setVolume(value) {
            this.volume = Math.max(0, Math.min(1, Number(value) || 0));
            if (this.masterGain) {
                this.masterGain.gain.setValueAtTime(this.volume, this.context.currentTime);
            }
        }

        hasLoop() {
            return Boolean(this.loopData);
        }

        getStatus() {
            return this.status;
        }

        getStatusDetail() {
            return this.statusDetail;
        }

        setLoopData(loopData) {
            this.loopData = this.normaliseLoopData(loopData);
            this.loopLengthSteps = this.loopData.totalSteps;
            this.loopIndex = Array.from({ length: this.loopLengthSteps }, () => []);
            let totalEvents = 0;
            this.loopData.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    const step = this.mod(note.step, this.loopLengthSteps);
                    this.loopIndex[step].push({
                        wave: track.wave,
                        note: note
                    });
                    totalEvents += 1;
                });
            });
            if (totalEvents === 0) {
                throw new Error('Generated loop contains no playable events.');
            }
            this.onDebug('loop_prepared', {
                totalEvents: totalEvents,
                totalSteps: this.loopLengthSteps,
                tempo: this.loopData.tempo
            });
        }

        playLoop(loopData = null) {
            if (loopData) {
                this.setLoopData(loopData);
                if (this.playing && this.context && this.context.state === 'running') {
                    if (!this.schedulerId) {
                        this.schedulerId = global.setInterval(() => this.schedulerTick(), 25);
                    }
                    this.currentStep = 0;
                    this.nextStepTime = this.context.currentTime + 0.05;
                    this.clearActiveSources();
                    return;
                }
            }

            if (!this.loopData || this.playing) {
                return;
            }

            if (!this.context || this.context.state !== 'running') {
                return;
            }

            this.playing = true;
            this.currentStep = 0;
            this.nextStepTime = this.context.currentTime + 0.05;
            this.schedulerId = global.setInterval(() => this.schedulerTick(), 25);
        }

        stopLoop() {
            this.playing = false;
            if (this.schedulerId) {
                global.clearInterval(this.schedulerId);
                this.schedulerId = null;
            }
            this.clearActiveSources();
        }

        dispose() {
            this.stopLoop();
            if (this.musicRnnModel && typeof this.musicRnnModel.dispose === 'function') {
                try {
                    this.musicRnnModel.dispose();
                } catch (error) {
                    this.onDebug('music_model_dispose_error', { message: error.message });
                }
            }
            this.musicRnnModel = null;
            this.selectedModel = null;
            this.lastGeneratedLoop = null;
            this.lastThemeFingerprint = null;
            this.lastCandidateResults = [];
            this.loopData = null;
            this.loopIndex = [];
            this.loopLengthSteps = 0;
            // Force lazy runtime reload if the same page flow re-initialises audio later.
            this.runtimeLibraryPromise = null;
        }

        clearActiveSources() {
            this.activeSources.forEach((source) => {
                try {
                    source.stop();
                } catch (error) {
                    // Ignore sources that have already ended.
                }
                try {
                    source.disconnect();
                } catch (error) {
                    // Ignore disconnect errors.
                }
            });
            this.activeSources.clear();
        }

        schedulerTick() {
            if (!this.playing || !this.context || !this.loopData) {
                return;
            }

            const scheduleAheadSeconds = 0.14;
            const secondsPerStep = 60 / this.loopData.tempo / 4;

            while (this.nextStepTime < this.context.currentTime + scheduleAheadSeconds) {
                const events = this.loopIndex[this.currentStep];
                events.forEach((event) => {
                    this.scheduleEvent(event, this.nextStepTime, secondsPerStep);
                });

                this.currentStep = this.mod(this.currentStep + 1, this.loopLengthSteps);
                this.nextStepTime += secondsPerStep;
            }
        }

        scheduleEvent(event, time, secondsPerStep) {
            if (event.wave === 'noise') {
                this.scheduleNoise(event.note, time, secondsPerStep);
                return;
            }
            this.scheduleSquare(event.note, time, secondsPerStep);
        }

        getProfilePreset() {
            if (!this.loopData || !this.loopData.profile) {
                return PROFILE_PRESETS.pulse_soft;
            }
            return PROFILE_PRESETS[this.loopData.profile] || PROFILE_PRESETS.pulse_soft;
        }

        scheduleSquare(note, time, secondsPerStep) {
            const preset = this.getProfilePreset();
            const duration = Math.max(secondsPerStep * note.length, secondsPerStep * 1.25);
            const osc = this.context.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(this.midiToFrequency(note.pitch), time);
            osc.detune.setValueAtTime(preset.detune, time);

            const gain = this.context.createGain();
            const velocity = Math.max(0.05, Math.min(1, note.velocity));
            gain.gain.setValueAtTime(0.0001, time);
            gain.gain.linearRampToValueAtTime(preset.gain * velocity, time + preset.attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + preset.release);

            this.toneFilter.frequency.setValueAtTime(preset.cutoff, time);

            osc.connect(gain);
            gain.connect(this.toneFilter);
            osc.start(time);
            osc.stop(time + duration + preset.release + 0.03);
            this.trackSource(osc);
        }

        scheduleNoise(note, time, secondsPerStep) {
            if (!this.noiseBuffer) {
                this.noiseBuffer = this.createNoiseBuffer();
            }
            const preset = this.getProfilePreset();
            const source = this.context.createBufferSource();
            source.buffer = this.noiseBuffer;

            const gain = this.context.createGain();
            const velocity = Math.max(0.05, Math.min(1, note.velocity));
            const duration = Math.max(secondsPerStep * note.length, secondsPerStep * 0.35);
            gain.gain.setValueAtTime(preset.noiseGain * velocity, time);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

            source.connect(gain);
            gain.connect(this.masterGain);
            source.start(time);
            source.stop(time + duration + 0.01);
            this.trackSource(source);
        }

        trackSource(source) {
            this.activeSources.add(source);
            source.addEventListener('ended', () => {
                this.activeSources.delete(source);
            });
        }

        createNoiseBuffer() {
            const sampleRate = this.context.sampleRate;
            const length = sampleRate * 0.5;
            const buffer = this.context.createBuffer(1, length, sampleRate);
            const channel = buffer.getChannelData(0);
            for (let i = 0; i < length; i += 1) {
                channel[i] = (Math.random() * 2 - 1) * 0.65;
            }
            return buffer;
        }

        midiToFrequency(midi) {
            return 440 * Math.pow(2, (midi - 69) / 12);
        }

        mod(value, base) {
            return ((value % base) + base) % base;
        }

        async runBenchmark() {
            const results = await this.evaluateCandidates();
            return {
                selected: this.selectedModel ? this.selectedModel.id : null,
                results: results
            };
        }

        async generateLoop(options = {}) {
            this.setStatus('generating', 'benchmarking_models');
            const bars = Number(options.bars) || 8;
            const tempo = Number(options.tempo) || 132;
            const soundProfile = options.soundProfile || 'pulse_soft';

            if (!this.selectedModel) {
                await this.evaluateCandidates();
            }

            if (!this.selectedModel) {
                this.setStatus('error', 'no_model_selected');
                const firstError = this.lastCandidateResults.find((result) => result && result.error);
                if (firstError) {
                    throw new Error(`${firstError.id}: ${firstError.error}`);
                }
                throw new Error('No suitable in-browser model is available.');
            }

            const start = performance.now();
            const loopData = await this.withTimeout(
                this.selectedModel.generate({ bars, tempo, soundProfile, seed: options.seed }),
                45000,
                'music_generation_timeout'
            );
            const generationMs = performance.now() - start;

            const normalised = this.normaliseLoopData(loopData);
            normalised.profile = soundProfile;
            this.setLoopData(normalised);
            this.setStatus('ready', this.selectedModel.id);

            this.onDebug('music_generation', {
                model: this.selectedModel.id,
                generationMs: Number(generationMs.toFixed(2)),
                coherence: Number(this.computeCoherence(normalised).toFixed(3))
            });

            return normalised;
        }

        async evaluateCandidates() {
            const candidates = [
                { id: 'magenta_music_rnn_basic_rnn', priority: 1, evaluator: () => this.evaluateMusicRnnBasic() }
            ];

            const results = [];
            for (const candidate of candidates) {
                try {
                    const result = await candidate.evaluator();
                    result.passes = this.passesThresholds(result);
                    result.priority = candidate.priority;
                    results.push(result);
                } catch (error) {
                    results.push({
                        id: candidate.id,
                        error: error.message,
                        priority: candidate.priority,
                        passes: false
                    });
                }
            }

            this.onDebug('music_model_benchmark', results);
            this.lastCandidateResults = results;

            const available = results
                .filter((result) => result.generate && !result.error)
                .sort((a, b) => {
                    const byPriority = (a.priority || 99) - (b.priority || 99);
                    if (byPriority !== 0) {
                        return byPriority;
                    }
                    return (a.generateMs + a.loadMs) - (b.generateMs + b.loadMs);
                });

            this.selectedModel = available.length > 0 ? available[0] : null;
            if (this.selectedModel) {
                this.onDebug('music_model_selected', {
                    id: this.selectedModel.id,
                    mode: this.selectedModel.passes ? 'strict' : 'priority_fallback'
                });
            }

            return results;
        }

        async evaluateMusicRnnBasic() {
            const memoryBefore = this.readMemory();
            const loadStart = performance.now();
            await this.ensureMusicRnnModel();
            const loadMs = performance.now() - loadStart;

            return {
                id: 'magenta_music_rnn_basic_rnn',
                loadMs: Number(loadMs.toFixed(2)),
                generateMs: 0,
                memoryMb: this.diffMemory(memoryBefore),
                coherence: 1,
                generate: async (params) => this.generateMusicRnnLoop(params)
            };
        }

        async ensureMusicRnnModel() {
            await this.ensureRuntimeLibraries();
            if (this.musicRnnModel) {
                return this.musicRnnModel;
            }
            if (!global.mm || typeof global.mm.MusicRNN !== 'function') {
                throw new Error('Magenta MusicRNN runtime is missing.');
            }

            this.musicRnnModel = new global.mm.MusicRNN(MUSIC_RNN_CHECKPOINT);
            await this.withTimeout(this.musicRnnModel.initialize(), MODEL_LOAD_TIMEOUT_MS, 'music_rnn_load_timeout');
            return this.musicRnnModel;
        }

        async ensureRuntimeLibraries() {
            if (global.tf && global.mm && typeof global.mm.MusicRNN === 'function') {
                return;
            }
            if (!this.runtimeLibraryPromise) {
                // Load once per tab-session and share promise across concurrent calls.
                this.runtimeLibraryPromise = (async () => {
                    await this.loadRuntimeScript(TFJS_CDN_URL, `tfjs-${this.runtimeSessionId}`);
                    await this.loadRuntimeScript(MAGENTA_CDN_URL, `magenta-${this.runtimeSessionId}`);
                })();
            }
            await this.runtimeLibraryPromise;
        }

        loadRuntimeScript(baseUrl, key) {
            return new Promise((resolve, reject) => {
                const selector = `script[data-runtime-lib="${key}"]`;
                const existing = global.document.querySelector(selector);
                if (existing) {
                    if (existing.dataset.loaded === 'true') {
                        resolve();
                        return;
                    }
                    existing.addEventListener('load', () => resolve(), { once: true });
                    existing.addEventListener('error', () => reject(new Error(`Failed to load runtime script: ${baseUrl}`)), { once: true });
                    return;
                }

                const script = global.document.createElement('script');
                script.src = `${baseUrl}?session=${encodeURIComponent(this.runtimeSessionId)}`;
                script.async = true;
                script.dataset.runtimeLib = key;
                script.addEventListener('load', () => {
                    script.dataset.loaded = 'true';
                    resolve();
                }, { once: true });
                script.addEventListener('error', () => reject(new Error(`Failed to load runtime script: ${baseUrl}`)), { once: true });
                global.document.head.appendChild(script);
            });
        }

        async generateMusicRnnLoop(params = {}) {
            const model = await this.ensureMusicRnnModel();
            const bars = Math.max(2, Number(params.bars) || 8);
            const tempo = Number(params.tempo) || 132;
            const soundProfile = params.soundProfile || 'pulse_soft';
            const totalSteps = bars * 16;
            const seed = String(params.seed || `${Date.now()}:${Math.random()}`);
            let bestLoop = null;
            let bestDifference = -1;

            for (let attempt = 0; attempt < 8; attempt += 1) {
                const primer = this.buildPrimerSequence(soundProfile, tempo, `${seed}:attempt:${attempt}`, attempt);
                const quantizedPrimer = global.mm.sequences.quantizeNoteSequence(primer, 4);
                const temperature = 1.0 + (attempt * 0.18) + (Math.random() * 0.25);
                const generated = await model.continueSequence(quantizedPrimer, totalSteps, temperature);
                const candidate = this.convertRnnSequenceToLoopData(generated, {
                    bars: bars,
                    tempo: tempo,
                    profile: soundProfile
                });

                const difference = this.lastGeneratedLoop
                    ? this.loopDifferenceScore(candidate, this.lastGeneratedLoop)
                    : 1;

                if (difference > bestDifference) {
                    bestDifference = difference;
                    bestLoop = candidate;
                }

                if (difference >= 0.5) {
                    break;
                }
            }

            if (!bestLoop) {
                throw new Error('MusicRNN did not produce a valid loop.');
            }

            if (this.lastGeneratedLoop && bestDifference < 0.35) {
                bestLoop = this.forceThemeVariation(bestLoop, seed);
                bestDifference = Math.max(bestDifference, this.loopDifferenceScore(bestLoop, this.lastGeneratedLoop));
            }

            this.onDebug('theme_difference', {
                bestDifference: Number(bestDifference.toFixed(3)),
                tempo: bestLoop.tempo
            });

            const fingerprint = this.fingerprintLoop(bestLoop);
            if (fingerprint) {
                this.lastThemeFingerprint = fingerprint;
            }
            this.lastGeneratedLoop = this.cloneLoopData(bestLoop);
            return bestLoop;
        }

        buildPrimerSequence(soundProfile, tempo, seed, variant = 0) {
            const scales = {
                pulse_soft: [60, 62, 64, 67, 69, 72],
                pulse_bright: [62, 64, 66, 69, 71, 74],
                pulse_crunch: [57, 60, 62, 65, 67, 69]
            };
            const rhythms = [
                [2, 2, 2, 2, 2, 2, 2, 2],
                [3, 1, 2, 2, 1, 3, 2, 2],
                [1, 1, 2, 1, 3, 1, 2, 5],
                [4, 1, 1, 2, 4, 1, 1, 2]
            ];
            const rand = this.seededRandom(seed);
            const baseScale = scales[soundProfile] || scales.pulse_soft;
            const rhythm = rhythms[variant % rhythms.length];
            const variantTranspose = [-7, -5, -2, 2, 5, 7][variant % 6];
            const notes = [];
            let stepCursor = 0;
            for (let i = 0; i < 8; i += 1) {
                const startStep = stepCursor;
                const pitchBase = baseScale[Math.floor(rand() * baseScale.length)];
                const pitch = Math.max(48, Math.min(88, pitchBase + variantTranspose));
                const length = Math.max(1, Math.min(4, rhythm[i] || 2));
                const startTime = startStep * (60 / tempo / 4);
                const endTime = (startStep + length) * (60 / tempo / 4);
                notes.push({
                    pitch: pitch,
                    startTime: startTime,
                    endTime: endTime,
                    velocity: Math.floor(72 + rand() * 40)
                });
                stepCursor += Math.max(1, Math.floor((rhythm[i] || 2) / 2));
                if (stepCursor >= 16) {
                    stepCursor = stepCursor % 16;
                }
            }

            return {
                tempos: [{ time: 0, qpm: tempo }],
                timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
                ticksPerQuarter: 220,
                notes: notes,
                totalTime: 16 * (60 / tempo / 4)
            };
        }

        seededRandom(seedText) {
            let seed = 2166136261;
            for (let i = 0; i < seedText.length; i += 1) {
                seed ^= seedText.charCodeAt(i);
                seed = Math.imul(seed, 16777619);
            }
            return () => {
                seed += 0x6D2B79F5;
                let t = seed;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        convertRnnSequenceToLoopData(sequence, options) {
            const stepsPerBar = 16;
            const totalSteps = Math.max(16, options.bars * stepsPerBar);
            const melody = [];

            if (!sequence || !Array.isArray(sequence.notes)) {
                throw new Error('MusicRNN returned no notes.');
            }

            sequence.notes.forEach((note) => {
                const step = this.quantizedStepFromNote(note, options.tempo);
                const endStep = typeof note.quantizedEndStep === 'number'
                    ? note.quantizedEndStep
                    : Math.round((Number(note.endTime) || 0) * ((options.tempo / 60) * 4));
                const length = Math.max(1, endStep - step);
                if (step < 0 || step >= totalSteps) {
                    return;
                }
                melody.push({
                    step: step,
                    length: Math.min(length, totalSteps - step),
                    pitch: Math.max(48, Math.min(88, Number(note.pitch) || 60)),
                    velocity: Math.max(0.2, Math.min(1, (Number(note.velocity) || 80) / 127))
                });
            });

            melody.sort((a, b) => a.step - b.step || a.pitch - b.pitch);

            if (melody.length === 0) {
                throw new Error('MusicRNN returned an empty sequence.');
            }

            const bass = [];
            const noise = [];

            for (let bar = 0; bar < options.bars; bar += 1) {
                const barStart = bar * stepsPerBar;
                const barEnd = barStart + stepsPerBar;
                const barNotes = melody
                    .filter((note) => note.step >= barStart && note.step < barEnd)
                    .sort((a, b) => a.pitch - b.pitch);
                const rootPitch = barNotes.length > 0 ? Math.max(32, barNotes[0].pitch - 24) : 36;
                bass.push({ step: barStart, length: 4, pitch: rootPitch, velocity: 0.62 });
                bass.push({ step: barStart + 4, length: 4, pitch: rootPitch + 7, velocity: 0.55 });
                bass.push({ step: barStart + 8, length: 4, pitch: rootPitch + 12, velocity: 0.58 });
                bass.push({ step: barStart + 12, length: 4, pitch: rootPitch + 7, velocity: 0.54 });
            }

            for (let step = 0; step < totalSteps; step += 4) {
                const accent = melody.some((note) => note.step === step || note.step === step + 1);
                noise.push({ step: step + 1, length: 1, pitch: 36, velocity: accent ? 0.56 : 0.38 });
                if ((step / 4) % 2 === 0) {
                    noise.push({ step: step + 3, length: 1, pitch: 36, velocity: accent ? 0.44 : 0.28 });
                }
            }

            return {
                tempo: options.tempo,
                stepsPerBar: stepsPerBar,
                totalSteps: totalSteps,
                profile: options.profile,
                tracks: [
                    { wave: 'square', notes: melody },
                    { wave: 'square', notes: bass },
                    { wave: 'noise', notes: noise }
                ]
            };
        }

        quantizedStepFromNote(note, tempo) {
            if (typeof note.quantizedStartStep === 'number') {
                return note.quantizedStartStep;
            }
            const stepsPerSecond = (tempo / 60) * 4;
            return Math.round((Number(note.startTime) || 0) * stepsPerSecond);
        }

        forceThemeVariation(loopData, seed) {
            const rand = this.seededRandom(`${seed}:force-variation`);
            const transposeOptions = [-12, -9, -7, 7, 9, 12];
            const transpose = transposeOptions[Math.floor(rand() * transposeOptions.length)];
            const stepShift = 2 + Math.floor(rand() * 5);
            const tempoScale = 0.9 + (rand() * 0.2);
            const variationMode = Math.floor(rand() * 3);

            const tracks = loopData.tracks.map((track, idx) => ({
                wave: track.wave,
                notes: this.applyTrackVariation(track.notes, idx, {
                    transpose: transpose,
                    stepShift: stepShift,
                    totalSteps: loopData.totalSteps,
                    mode: variationMode
                })
            }));

            return {
                tempo: Math.max(92, Math.min(176, Math.round(loopData.tempo * tempoScale))),
                stepsPerBar: loopData.stepsPerBar,
                totalSteps: loopData.totalSteps,
                profile: loopData.profile,
                tracks: tracks
            };
        }

        applyTrackVariation(notes, trackIndex, options) {
            if (!Array.isArray(notes)) {
                return [];
            }
            return notes.map((note, noteIndex) => {
                if (trackIndex !== 0) {
                    return {
                        step: note.step,
                        length: note.length,
                        pitch: note.pitch,
                        velocity: note.velocity
                    };
                }

                let pitch = note.pitch + options.transpose;
                let step = note.step + options.stepShift;
                if (options.mode === 1) {
                    pitch = 72 - (note.pitch - 60);
                } else if (options.mode === 2 && noteIndex % 2 === 0) {
                    pitch += 5;
                }

                step = this.mod(step, options.totalSteps);
                return {
                    step: step,
                    length: note.length,
                    pitch: Math.max(48, Math.min(88, pitch)),
                    velocity: note.velocity
                };
            }).sort((a, b) => a.step - b.step || a.pitch - b.pitch);
        }

        cloneLoopData(loopData) {
            return {
                tempo: loopData.tempo,
                stepsPerBar: loopData.stepsPerBar,
                totalSteps: loopData.totalSteps,
                profile: loopData.profile,
                tracks: loopData.tracks.map((track) => ({
                    wave: track.wave,
                    notes: track.notes.map((note) => ({
                        step: note.step,
                        length: note.length,
                        pitch: note.pitch,
                        velocity: note.velocity
                    }))
                }))
            };
        }

        loopDifferenceScore(aLoop, bLoop) {
            const a = this.extractMelodyNotes(aLoop);
            const b = this.extractMelodyNotes(bLoop);
            if (a.length === 0 || b.length === 0) {
                return 1;
            }

            const minLength = Math.min(a.length, b.length, 64);
            let exactMatches = 0;
            for (let i = 0; i < minLength; i += 1) {
                const sameStep = a[i].step === b[i].step;
                const samePitch = a[i].pitch === b[i].pitch;
                if (sameStep && samePitch) {
                    exactMatches += 1;
                }
            }
            const exactSimilarity = exactMatches / minLength;

            const pitchClassSet = (notes) => new Set(notes.slice(0, 80).map((note) => note.pitch % 12));
            const setA = pitchClassSet(a);
            const setB = pitchClassSet(b);
            const union = new Set([...setA, ...setB]).size || 1;
            let intersection = 0;
            setA.forEach((value) => {
                if (setB.has(value)) {
                    intersection += 1;
                }
            });
            const pitchSimilarity = intersection / union;

            const aTempo = Number(aLoop.tempo) || 132;
            const bTempo = Number(bLoop.tempo) || 132;
            const tempoSimilarity = 1 - Math.min(1, Math.abs(aTempo - bTempo) / 40);
            const contourSimilarity = this.melodyContourSimilarity(a, b);
            const similarity = (exactSimilarity * 0.45) + (pitchSimilarity * 0.2) + (contourSimilarity * 0.33) + (tempoSimilarity * 0.02);
            return Math.max(0, Math.min(1, 1 - similarity));
        }

        melodyContourSimilarity(a, b) {
            const aIntervals = [];
            const bIntervals = [];
            const aLimit = Math.min(a.length - 1, 40);
            const bLimit = Math.min(b.length - 1, 40);
            for (let i = 0; i < aLimit; i += 1) {
                aIntervals.push(Math.sign(a[i + 1].pitch - a[i].pitch));
            }
            for (let i = 0; i < bLimit; i += 1) {
                bIntervals.push(Math.sign(b[i + 1].pitch - b[i].pitch));
            }

            const minLength = Math.min(aIntervals.length, bIntervals.length);
            if (minLength === 0) {
                return 1;
            }

            let same = 0;
            for (let i = 0; i < minLength; i += 1) {
                if (aIntervals[i] === bIntervals[i]) {
                    same += 1;
                }
            }
            return same / minLength;
        }

        extractMelodyNotes(loopData) {
            if (!loopData || !Array.isArray(loopData.tracks)) {
                return [];
            }
            const melodyTrack = loopData.tracks.find((track) => track.wave === 'square' && Array.isArray(track.notes) && track.notes.length > 0);
            if (!melodyTrack) {
                return [];
            }
            return melodyTrack.notes
                .map((note) => ({
                    step: Math.max(0, Math.floor(note.step || 0)),
                    pitch: Math.max(24, Math.min(96, Math.floor(note.pitch || 60)))
                }))
                .sort((x, y) => x.step - y.step || x.pitch - y.pitch);
        }

        fingerprintLoop(loopData) {
            if (!loopData || !Array.isArray(loopData.tracks)) {
                return '';
            }
            const melodyTrack = loopData.tracks.find((track) => track.wave === 'square');
            if (!melodyTrack || !Array.isArray(melodyTrack.notes) || melodyTrack.notes.length === 0) {
                return '';
            }
            return melodyTrack.notes
                .slice(0, 48)
                .map((note) => `${note.step}:${note.pitch}:${note.length}`)
                .join('|');
        }

        passesThresholds(result, thresholds = MODEL_THRESHOLDS) {
            if (!result || result.error) {
                return false;
            }
            if (result.loadMs > thresholds.maxLoadMs) {
                return false;
            }
            if (result.generateMs > thresholds.maxGenerateMs) {
                return false;
            }
            if (typeof result.memoryMb === 'number' && result.memoryMb > thresholds.maxMemoryMb) {
                return false;
            }
            if (result.coherence < thresholds.minCoherence) {
                return false;
            }
            return true;
        }

        normaliseLoopData(loopData) {
            const stepsPerBar = Number(loopData.stepsPerBar) || 16;
            const totalSteps = Number(loopData.totalSteps) || (Number(loopData.bars) || 8) * stepsPerBar;
            const tempo = Number(loopData.tempo) || 132;
            const profile = loopData.profile || 'pulse_soft';
            const tracks = Array.isArray(loopData.tracks) ? loopData.tracks : [];

            return {
                tempo: Math.max(80, Math.min(190, tempo)),
                stepsPerBar: stepsPerBar,
                totalSteps: Math.max(16, totalSteps),
                profile: profile,
                tracks: tracks.map((track) => ({
                    wave: track.wave === 'noise' ? 'noise' : 'square',
                    notes: (track.notes || []).map((note) => ({
                        step: Math.max(0, Math.floor(note.step || 0)),
                        length: Math.max(1, Math.floor(note.length || 1)),
                        pitch: Math.max(24, Math.min(96, Math.floor(note.pitch || 60))),
                        velocity: Math.max(0.05, Math.min(1, Number(note.velocity) || 0.6))
                    }))
                }))
            };
        }

        computeCoherence(loopData) {
            if (!loopData || !Array.isArray(loopData.tracks)) {
                return 0;
            }

            const melodicNotes = loopData.tracks
                .filter((track) => track.wave === 'square')
                .flatMap((track) => track.notes);
            if (melodicNotes.length === 0) {
                return 0;
            }

            const cMajor = new Set([0, 2, 4, 5, 7, 9, 11]);
            const inScale = melodicNotes.filter((note) => cMajor.has(note.pitch % 12)).length / melodicNotes.length;

            const bars = Math.max(1, Math.floor(loopData.totalSteps / loopData.stepsPerBar));
            const barSignatures = [];
            for (let bar = 0; bar < bars; bar += 1) {
                const start = bar * loopData.stepsPerBar;
                const end = start + loopData.stepsPerBar;
                const notesInBar = melodicNotes
                    .filter((note) => note.step >= start && note.step < end)
                    .map((note) => `${this.mod(note.step, loopData.stepsPerBar)}:${note.pitch}`)
                    .sort()
                    .join('|');
                barSignatures.push(notesInBar);
            }
            const uniqueBars = new Set(barSignatures).size;
            const repetition = 1 - ((uniqueBars - 1) / Math.max(1, bars - 1));
            const nonEmptyBars = barSignatures.filter((signature) => signature.length > 0).length / bars;

            return Number(Math.max(0, Math.min(1, inScale * 0.4 + repetition * 0.35 + nonEmptyBars * 0.25)).toFixed(3));
        }

        readMemory() {
            if (!performance || !performance.memory || !performance.memory.usedJSHeapSize) {
                return null;
            }
            return performance.memory.usedJSHeapSize / (1024 * 1024);
        }

        diffMemory(memoryBefore) {
            if (typeof memoryBefore !== 'number') {
                return null;
            }
            const current = this.readMemory();
            if (typeof current !== 'number') {
                return null;
            }
            return Number(Math.max(0, current - memoryBefore).toFixed(2));
        }

        withTimeout(promise, timeoutMs, timeoutLabel) {
            return Promise.race([
                promise,
                new Promise((_, reject) => {
                    global.setTimeout(() => {
                        reject(new Error(timeoutLabel));
                    }, timeoutMs);
                })
            ]);
        }
    }

    global.AudioEngine = AudioEngine;
})(window);
