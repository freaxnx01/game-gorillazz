# AI Music Runtime (Client-Only)

## Ziel
Die Musikgenerierung läuft ausschliesslich im Browser des Clients:

- Kein Server-Side Inference.
- Keine persistente Speicherung des Modells im Anwendungscode.
- Modell und Runtime werden pro Browser-Session geladen.
- Beim Schliessen von Tab/Fenster wird das Modell aktiv freigegeben.

## Architektur
Die Audio-Engine ist in `src/audio.js` implementiert.

### 1) Lazy Runtime Load im Browser
Die Libraries werden erst geladen, wenn Musik tatsächlich benötigt wird:

- TensorFlow.js (`tf.min.js`)
- Magenta Music (`magentamusic.js`)

Relevante Funktionen:

- `ensureRuntimeLibraries()`
- `loadRuntimeScript(baseUrl, key)`

Die Script-URLs werden mit einer Session-ID versehen (`?session=...`), damit jede neue Page-Session einen frischen Runtime-Kontext aufbaut.

### 2) Modellinitialisierung
Das Modell ist:

- `Magenta MusicRNN basic_rnn`

Es wird in der Audio-Engine initialisiert via:

- `ensureMusicRnnModel()`
- `new mm.MusicRNN(MUSIC_RNN_CHECKPOINT)`
- `model.initialize()`

### 3) Generierung
Bei Klick auf "Musik erzeugen" läuft:

- `generateAndPlayMusic()` in `src/gorillas.js`
- `audioEngine.generateLoop(...)`
- intern `generateMusicRnnLoop(...)`

Die Engine erzeugt mehrere Kandidaten und wählt den melodisch unterschiedlichsten zum letzten Theme.

### 4) Wiedergabe
Die Engine rendert die Note-Sequenz mit Web Audio:

- `playLoop(...)`
- `schedulerTick()`
- `scheduleSquare(...)` / `scheduleNoise(...)`

### 5) Session-Ende / Cleanup
Beim Verlassen der Seite wird freigegeben:

- `disposeAudioSession()` in `src/gorillas.js`
- Hooks: `pagehide` und `beforeunload`
- `audioEngine.dispose()` setzt Modell und interne Daten zurück und ruft `musicRnnModel.dispose()` auf.

## Verifikation in DevTools
1. DevTools öffnen.
2. Network-Tab aufrufen.
3. "Musik erzeugen" klicken.
4. Prüfen, dass Runtime/Modell im Browser geladen werden.
5. Console prüfen auf:
   - `[AudioEngine] music_model_selected`
   - `[AudioEngine] music_generation`
   - `[AudioEngine] theme_difference`
6. Tab schliessen und neu öffnen.
7. Erneut "Musik erzeugen" klicken: Runtime/Modell werden für die neue Session erneut geladen.

## Grenzen
- HTTP-Caching wird vom Browser verwaltet; die App schreibt keine persistente Modellkopie.
- Die Laufzeitdaten (Modellobjekt, Sequenzen, Loop-State) existieren nur im RAM der aktuellen Session.
