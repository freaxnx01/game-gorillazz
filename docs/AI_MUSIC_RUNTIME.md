# AI Music Runtime (Client-Only)

## Goal
Music generation runs exclusively in the client browser:

- No server-side inference.
- No persistent model storage in application code.
- Model and runtime are loaded per browser session.
- The model is explicitly released when the tab or window is closed.

## Architecture
The audio engine is implemented in `src/audio.js`.

### 1) Lazy Runtime Load in the Browser
Libraries are loaded only when music is actually needed:

- TensorFlow.js (`tf.min.js`)
- Magenta Music (`magentamusic.js`)

Relevant functions:

- `ensureRuntimeLibraries()`
- `loadRuntimeScript(baseUrl, key)`

Script URLs are tagged with a session ID (`?session=...`) so each new page session gets a fresh runtime context.

### 2) Model Initialisation
The model is:

- `Magenta MusicRNN basic_rnn`

It is initialised in the audio engine via:

- `ensureMusicRnnModel()`
- `new mm.MusicRNN(MUSIC_RNN_CHECKPOINT)`
- `model.initialize()`

### 3) Generation
When the user clicks "Generate Music", the following flow runs:

- `generateAndPlayMusic()` in `src/gorillas.js`
- `audioEngine.generateLoop(...)`
- internally `generateMusicRnnLoop(...)`

The engine generates multiple candidates and chooses the one that is most melodically different from the previous theme.

### 4) Playback
The engine renders the note sequence with Web Audio:

- `playLoop(...)`
- `schedulerTick()`
- `scheduleSquare(...)` / `scheduleNoise(...)`

### 5) Session End / Cleanup
On page exit, resources are released:

- `disposeAudioSession()` in `src/gorillas.js`
- hooks: `pagehide` and `beforeunload`
- `audioEngine.dispose()` resets model and internal data and calls `musicRnnModel.dispose()`.

## Verification in DevTools
1. Open DevTools.
2. Open the Network tab.
3. Click "Generate Music".
4. Verify that runtime and model assets are loaded in the browser.
5. Check the Console for:
   - `[AudioEngine] music_model_selected`
   - `[AudioEngine] music_generation`
   - `[AudioEngine] theme_difference`
6. Close the tab and open it again.
7. Click "Generate Music" again: runtime and model should reload for the new session.

## Limits
- HTTP caching is managed by the browser; the app does not write a persistent model copy.
- Runtime data (model object, sequences, loop state) exists only in RAM for the current session.
