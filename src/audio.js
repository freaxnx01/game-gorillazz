(function initAudioEngineScope(global) {
    'use strict';

    const MODEL_THRESHOLDS = {
        maxLoadMs: 2500,
        maxGenerateMs: 1000,
        maxMemoryMb: 80,
        minCoherence: 0.45
    };

    const RELAXED_THRESHOLDS = {
        maxLoadMs: 18000,
        maxGenerateMs: 8000,
        maxMemoryMb: 220,
        minCoherence: 0.3
    };

    const PROFILE_PRESETS = {
        pulse_soft: { cutoff: 1400, attack: 0.01, release: 0.12, gain: 0.22, detune: 0, noiseGain: 0.08 },
        pulse_bright: { cutoff: 2800, attack: 0.003, release: 0.08, gain: 0.25, detune: 5, noiseGain: 0.06 },
        pulse_crunch: { cutoff: 1100, attack: 0.002, release: 0.05, gain: 0.28, detune: 12, noiseGain: 0.12 }
    };

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
            this.volume = 0.55;
            this.selectedModel = null;
            this.status = 'idle';
            this.statusDetail = '';
            this.activeSources = new Set();
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
            this.loopData.tracks.forEach((track) => {
                track.notes.forEach((note) => {
                    const step = this.mod(note.step, this.loopLengthSteps);
                    this.loopIndex[step].push({
                        wave: track.wave,
                        note: note
                    });
                });
            });
        }

        playLoop(loopData = null) {
            if (loopData) {
                this.setLoopData(loopData);
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
            const duration = Math.max(secondsPerStep * note.length, secondsPerStep * 0.8);
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
                this.setStatus('error', 'no_model_selected_after_relaxed_fallback');
                throw new Error('No suitable in-browser model met performance thresholds.');
            }

            const start = performance.now();
            const loopData = await this.withTimeout(
                this.selectedModel.generate({ bars, tempo, soundProfile, seed: options.seed }),
                12000,
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
                { id: 'tiny_markov_lite', evaluator: () => this.evaluateTinyMarkovLite() }
            ];

            const results = [];
            for (const candidate of candidates) {
                try {
                    const result = await candidate.evaluator();
                    result.passes = this.passesThresholds(result);
                    results.push(result);
                } catch (error) {
                    results.push({
                        id: candidate.id,
                        error: error.message,
                        passes: false
                    });
                }
            }

            this.onDebug('music_model_benchmark', results);

            const passing = results
                .filter((result) => result.passes && result.generate)
                .sort((a, b) => {
                    const scoreA = a.generateMs + a.loadMs - (a.coherence * 180);
                    const scoreB = b.generateMs + b.loadMs - (b.coherence * 180);
                    return scoreA - scoreB;
                });

            if (passing.length > 0) {
                this.selectedModel = passing[0];
                this.onDebug('music_model_selected', {
                    id: this.selectedModel.id,
                    mode: 'strict'
                });
            } else {
                const viableFallback = results
                    .filter((result) => result.generate && !result.error && this.passesThresholds(result, RELAXED_THRESHOLDS))
                    .sort((a, b) => (a.generateMs + a.loadMs) - (b.generateMs + b.loadMs));

                this.selectedModel = viableFallback.length > 0 ? viableFallback[0] : null;
                if (this.selectedModel) {
                    this.onDebug('music_model_selected', {
                        id: this.selectedModel.id,
                        mode: 'relaxed_fallback'
                    });
                }
            }

            return results;
        }

        async evaluateTinyMarkovLite() {
            const memoryBefore = this.readMemory();
            const loadStart = performance.now();
            await Promise.resolve();
            const loadMs = performance.now() - loadStart;

            const generateStart = performance.now();
            const sampleLoop = this.generateTinyLoop({
                bars: 8,
                tempo: 132,
                soundProfile: 'pulse_soft',
                seed: 'benchmark'
            });
            const generateMs = performance.now() - generateStart;

            return {
                id: 'tiny_markov_lite',
                loadMs: Number(loadMs.toFixed(2)),
                generateMs: Number(generateMs.toFixed(2)),
                memoryMb: this.diffMemory(memoryBefore),
                coherence: this.computeCoherence(sampleLoop),
                generate: async (params) => this.generateTinyLoop(params)
            };
        }

        generateTinyLoop(params = {}) {
            const bars = Number(params.bars) || 8;
            const stepsPerBar = 16;
            const totalSteps = bars * stepsPerBar;
            const tempo = Number(params.tempo) || 132;
            const soundProfile = params.soundProfile || 'pulse_soft';
            const rand = this.seededRandom(`${soundProfile}:${params.seed || 'gorillazz'}:${bars}:${tempo}`);

            const scales = {
                pulse_soft: [60, 62, 64, 67, 69, 72],
                pulse_bright: [62, 64, 66, 69, 71, 74],
                pulse_crunch: [57, 60, 62, 65, 67, 69]
            };
            const baseScale = scales[soundProfile] || scales.pulse_soft;

            const motif = [];
            for (let i = 0; i < 8; i += 1) {
                const step = i * 2;
                const idx = Math.floor(rand() * baseScale.length);
                const noteLength = (i % 3 === 0) ? 2 : 1;
                motif.push({
                    step: step,
                    length: noteLength,
                    pitch: baseScale[idx],
                    velocity: 0.6 + rand() * 0.25
                });
            }

            const melody = [];
            for (let bar = 0; bar < bars; bar += 1) {
                const barShift = bar * stepsPerBar;
                const transpose = (bar % 4 === 3) ? 2 : 0;
                motif.forEach((m) => {
                    melody.push({
                        step: barShift + m.step,
                        length: m.length,
                        pitch: m.pitch + transpose,
                        velocity: m.velocity
                    });
                });
            }

            const bassRoot = [36, 38, 41, 38];
            const bass = [];
            for (let bar = 0; bar < bars; bar += 1) {
                const root = bassRoot[bar % bassRoot.length];
                const start = bar * stepsPerBar;
                bass.push({ step: start, length: 4, pitch: root, velocity: 0.62 });
                bass.push({ step: start + 4, length: 4, pitch: root + 7, velocity: 0.55 });
                bass.push({ step: start + 8, length: 4, pitch: root + 12, velocity: 0.58 });
                bass.push({ step: start + 12, length: 4, pitch: root + 7, velocity: 0.54 });
            }

            const noise = [];
            for (let step = 0; step < totalSteps; step += 4) {
                noise.push({ step: step + 1, length: 1, pitch: 36, velocity: 0.45 + rand() * 0.2 });
                if ((step / 4) % 2 === 0) {
                    noise.push({ step: step + 3, length: 1, pitch: 36, velocity: 0.35 + rand() * 0.2 });
                }
            }

            return {
                tempo: tempo,
                stepsPerBar: stepsPerBar,
                totalSteps: totalSteps,
                profile: soundProfile,
                tracks: [
                    { wave: 'square', notes: melody },
                    { wave: 'square', notes: bass },
                    { wave: 'noise', notes: noise }
                ]
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
