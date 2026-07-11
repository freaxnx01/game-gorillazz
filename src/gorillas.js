// Gorillas Game - Browser Edition
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1100;
canvas.height = 500;

// Seeded RNG so both peers generate identical skylines/wind in multiplayer.
// Defaults to Math.random in single-player; seedRng() switches to a deterministic
// stream keyed by a shared seed exchanged over the network.
function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
let rng = Math.random;
function seedRng(seed) { rng = mulberry32((seed >>> 0) || 1); }

// Language translations
const translations = {
    de: {
        title: 'GORILLAZZ',
        player: 'Spieler',
        angle: 'Winkel:',
        velocity: 'Geschwindigkeit:',
        throwButton: 'BANANE WERFEN!',
        hintButton: 'HINWEIS',
        newGameButton: 'NEUES SPIEL',
        settingsButton: 'EINSTELLUNGEN',
        creditsButton: 'CREDITS',
        playerTurn: 'Spieler {player} ist dran',
        day: 'Tag',
        dawn: 'Dämmerung',
        night: 'Nacht',
        wind: 'Wind:',
        winsRound: 'Spieler {player} gewinnt diese Runde!',
        hitBuilding: 'Gebäude getroffen!',
        missed: 'Verfehlt!',
        bananaInFlight: 'Banane im Flug!',
        invalidInput: 'Ungültige Eingabewerte!',
        hintMessage: 'Hinweis: Versuche {angle}° mit Geschwindigkeit {velocity}!',
        dawnBreaking: 'Die Dämmerung bricht an...',
        nightFallen: 'Die Nacht ist hereingebrochen...',
        newDayBegins: 'Ein neuer Tag beginnt...',
        language: 'Sprache:',
        settingsTitle: 'Einstellungen',
        destroyBuildingSetting: 'Gebäude zerstören',
        helpingModeSetting: 'Hilfslinie anzeigen',
        musicEnabledSetting: 'In-Game Musik',
        musicProfileSetting: 'Musik-Profil',
        musicGenerateButton: 'MUSIK ERZEUGEN',
        musicStatusLabel: 'Musikstatus:',
        musicStatusIdle: 'Leerlauf',
        musicStatusGenerating: 'Wird erzeugt...',
        musicStatusReady: 'Bereit',
        musicStatusError: 'Fehler',
        musicGenerationFailed: 'Musik konnte nicht erzeugt werden.',
        musicGenerationReady: 'Musik läuft.',
        musicDisabled: 'Musik deaktiviert.',
        musicNotSupported: 'Audio wird von diesem Browser nicht unterstützt.',
        closeButton: 'Schließen',
        keysButton: 'KEYS',
        keysTitle: 'Tastenkombinationen',
        keyEnter: 'Banane werfen',
        keyB: 'Lichter blinken (ein/aus)',
        keyN: 'Tag/Nacht wechseln',
        keyH: 'Herz anzeigen/ausblenden',
        keyT: 'Hilfslinie ein/aus',
        keyP: 'Spieler wechseln',
        keyE: 'Augen erstaunen ein/aus',
        keyG: 'Neue Skyline generieren',
        keyM: 'Musik ein/aus',
        dedication: 'Dieses Spiel ist Juliska gewidmet',
        multiplayerButton: 'MEHRSPIELER',
        mpTitle: 'Mehrspieler (Peer-to-Peer)',
        mpChoosePrompt: 'Spiele online gegen einen Freund – ganz ohne Server. Ein Code wird kopiert und eingefügt.',
        mpHostBtn: 'Spiel hosten',
        mpJoinBtn: 'Mit Code beitreten',
        mpHostTitle: 'Spiel hosten',
        mpJoinTitle: 'Spiel beitreten',
        mpStepInvite: 'Sende diesen Einladungscode an deinen Freund',
        mpCopyInvite: 'Einladungscode kopieren',
        mpStepAnswer: 'Füge hier den Antwortcode deines Freundes ein',
        mpConnectBtn: 'Verbinden',
        mpStepPasteInvite: 'Füge den Einladungscode des Hosts ein',
        mpCreateReplyBtn: 'Antwortcode erstellen',
        mpStepReply: 'Sende diesen Antwortcode zurück an den Host',
        mpCopyReply: 'Antwortcode kopieren',
        mpBackBtn: 'Zurück',
        mpDisconnectBtn: 'Verbindung trennen',
        mpCreating: 'Code wird erstellt…',
        mpWaiting: 'Warte auf den Antwortcode…',
        mpConnecting: 'Verbinde…',
        mpConnected: 'Verbunden! Los geht’s!',
        mpSendReply: 'Sende den Antwortcode an den Host und warte…',
        mpBadCode: 'Code ungültig – füge den vollständigen Code ein.',
        mpCodeError: 'Code konnte nicht erstellt werden.',
        mpCopied: 'Kopiert!',
        netYouAre: 'Du bist Spieler {player}',
        netYourTurn: 'du bist dran',
        netOpponentTurn: 'Gegner ist dran',
        netNotYourTurn: 'Du bist nicht dran!',
        netDisconnected: 'Verbindung getrennt – zurück im lokalen Spiel.'
    },
    en: {
        title: 'GORILLAZZ',
        player: 'Player',
        angle: 'Angle:',
        velocity: 'Velocity:',
        throwButton: 'THROW BANANA!',
        hintButton: 'HINT',
        newGameButton: 'NEW GAME',
        settingsButton: 'SETTINGS',
        creditsButton: 'CREDITS',
        playerTurn: 'Player {player}\'s Turn',
        day: 'Day',
        dawn: 'Dawn',
        night: 'Night',
        wind: 'Wind:',
        winsRound: 'Player {player} wins this round!',
        hitBuilding: 'Hit building!',
        missed: 'Missed!',
        bananaInFlight: 'Banana in flight!',
        invalidInput: 'Invalid input values!',
        hintMessage: 'Hint: Try {angle}° at velocity {velocity}!',
        dawnBreaking: 'Dawn is breaking...',
        nightFallen: 'Night has fallen...',
        newDayBegins: 'A new day begins...',
        language: 'Language:',
        settingsTitle: 'Settings',
        destroyBuildingSetting: 'Destroy Buildings',
        helpingModeSetting: 'Show helping line',
        musicEnabledSetting: 'In-game music',
        musicProfileSetting: 'Music profile',
        musicGenerateButton: 'GENERATE MUSIC',
        musicStatusLabel: 'Music status:',
        musicStatusIdle: 'Idle',
        musicStatusGenerating: 'Generating...',
        musicStatusReady: 'Ready',
        musicStatusError: 'Error',
        musicGenerationFailed: 'Music generation failed.',
        musicGenerationReady: 'Music is playing.',
        musicDisabled: 'Music disabled.',
        musicNotSupported: 'Audio is not supported in this browser.',
        closeButton: 'Close',
        keysButton: 'KEYS',
        keysTitle: 'Keyboard Shortcuts',
        keyEnter: 'Throw banana',
        keyB: 'Toggle blinking lights',
        keyN: 'Toggle day/night',
        keyH: 'Toggle heart display',
        keyT: 'Toggle helping line',
        keyP: 'Switch player',
        keyE: 'Toggle astonished eyes',
        keyG: 'Generate new skyline',
        keyM: 'Toggle music on/off',
        dedication: 'This game is dedicated to Juliska',
        multiplayerButton: 'MULTIPLAYER',
        mpTitle: 'Multiplayer (Peer-to-Peer)',
        mpChoosePrompt: 'Play a friend online with no server — just copy and paste a connect code.',
        mpHostBtn: 'Host a game',
        mpJoinBtn: 'Join with a code',
        mpHostTitle: 'Host a game',
        mpJoinTitle: 'Join a game',
        mpStepInvite: 'Send this invite code to your friend',
        mpCopyInvite: 'Copy invite code',
        mpStepAnswer: 'Paste their reply code here',
        mpConnectBtn: 'Connect',
        mpStepPasteInvite: 'Paste the host’s invite code',
        mpCreateReplyBtn: 'Create reply code',
        mpStepReply: 'Send this reply code back to the host',
        mpCopyReply: 'Copy reply code',
        mpBackBtn: 'Back',
        mpDisconnectBtn: 'Disconnect',
        mpCreating: 'Creating code…',
        mpWaiting: 'Waiting for the reply code…',
        mpConnecting: 'Connecting…',
        mpConnected: 'Connected! Let’s play!',
        mpSendReply: 'Send the reply code to the host, then wait…',
        mpBadCode: 'That code didn’t parse — paste the full code.',
        mpCodeError: 'Could not create code.',
        mpCopied: 'Copied!',
        netYouAre: 'You are Player {player}',
        netYourTurn: 'your turn',
        netOpponentTurn: 'opponent’s turn',
        netNotYourTurn: 'Not your turn!',
        netDisconnected: 'Disconnected — back to local play.'
    },
    hu: {
        title: 'GORILLAZZ',
        player: 'Játékos',
        angle: 'Szög:',
        velocity: 'Sebesség:',
        throwButton: 'BANÁN DOBÁS!',
        hintButton: 'TIPP',
        newGameButton: 'ÚJ JÁTÉK',
        settingsButton: 'BEÁLLÍTÁSOK',
        creditsButton: 'STÁBLISTA',
        keysButton: 'BILLENTYŰK',
        playerTurn: '{player}. játékos következik',
        day: 'Nappal',
        dawn: 'Hajnal',
        night: 'Éjszaka',
        wind: 'Szél:',
        winsRound: '{player}. játékos nyert!',
        hitBuilding: 'Eltalálta az épületet!',
        missed: 'Nem talált!',
        bananaInFlight: 'A banán repül!',
        invalidInput: 'Érvénytelen értékek!',
        hintMessage: 'Tipp: Próbáld {angle}° szöggel {velocity} sebességgel!',
        dawnBreaking: 'Virrad...',
        nightFallen: 'Leszállt az éjszaka...',
        newDayBegins: 'Új nap kezdődik...',
        language: 'Nyelv:',
        settingsTitle: 'Beállítások',
        destroyBuildingSetting: 'Épületek rombolása',
        helpingModeSetting: 'Segédvonal megjelenítése',
        musicEnabledSetting: 'Játékon belüli zene',
        musicProfileSetting: 'Zenei profil',
        musicGenerateButton: 'ZENE GENERÁLÁSA',
        musicStatusLabel: 'Zene állapota:',
        musicStatusIdle: 'Készenlét',
        musicStatusGenerating: 'Generálás...',
        musicStatusReady: 'Kész',
        musicStatusError: 'Hiba',
        musicGenerationFailed: 'A zene generálása sikertelen.',
        musicGenerationReady: 'A zene szól.',
        musicDisabled: 'A zene kikapcsolva.',
        musicNotSupported: 'A böngésző nem támogatja a hangot.',
        closeButton: 'Bezárás',
        keysTitle: 'Billentyűparancsok',
        keyEnter: 'Banán dobása',
        keyB: 'Villogó fények ki/be',
        keyN: 'Nappal/éjszaka váltás',
        keyH: 'Szív megjelenítése/elrejtése',
        keyT: 'Segédvonal ki/be',
        keyP: 'Játékos váltás',
        keyE: 'Csodálkozó szemek ki/be',
        keyG: 'Új égvonal generálása',
        keyM: 'Zene be/ki',
        dedication: 'Ez a játék Juliskának van szentelve',
        multiplayerButton: 'TÖBBJÁTÉKOS',
        mpTitle: 'Többjátékos (Peer-to-Peer)',
        mpChoosePrompt: 'Játssz online egy barátoddal szerver nélkül – csak másold ki és illeszd be a kódot.',
        mpHostBtn: 'Játék indítása',
        mpJoinBtn: 'Csatlakozás kóddal',
        mpHostTitle: 'Játék indítása',
        mpJoinTitle: 'Csatlakozás',
        mpStepInvite: 'Küldd el ezt a meghívókódot a barátodnak',
        mpCopyInvite: 'Meghívókód másolása',
        mpStepAnswer: 'Illeszd be ide a válaszkódját',
        mpConnectBtn: 'Csatlakozás',
        mpStepPasteInvite: 'Illeszd be a gazda meghívókódját',
        mpCreateReplyBtn: 'Válaszkód létrehozása',
        mpStepReply: 'Küldd vissza ezt a válaszkódot a gazdának',
        mpCopyReply: 'Válaszkód másolása',
        mpBackBtn: 'Vissza',
        mpDisconnectBtn: 'Kapcsolat bontása',
        mpCreating: 'Kód létrehozása…',
        mpWaiting: 'Várakozás a válaszkódra…',
        mpConnecting: 'Csatlakozás…',
        mpConnected: 'Csatlakozva! Kezdődik!',
        mpSendReply: 'Küldd el a válaszkódot a gazdának, majd várj…',
        mpBadCode: 'A kód érvénytelen – illeszd be a teljes kódot.',
        mpCodeError: 'A kód létrehozása sikertelen.',
        mpCopied: 'Másolva!',
        netYouAre: '{player}. játékos vagy',
        netYourTurn: 'te jössz',
        netOpponentTurn: 'ellenfél jön',
        netNotYourTurn: 'Nem te jössz!',
        netDisconnected: 'Kapcsolat megszakadt – vissza a helyi játékhoz.'
    }
};

let currentLanguage = 'de'; // Default to German

function t(key, replacements = {}) {
    let text = translations[currentLanguage][key] || key;
    Object.keys(replacements).forEach(placeholder => {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    return text;
}

// Settings
const settings = {
    destroyBuildings: false,
    blinkingLights: false,
    blinkState: false,
    lastBlinkTime: 0,
    heartActive: false,
    heartBuilding: null,
    helpingMode: false,
    trajectoryProgress: 0,
    lastTrajectoryUpdate: 0,
    musicEnabled: false,
    selectedSoundProfile: 'pulse_soft',
    musicStatus: 'idle',
    musicGenerateClickCount: 0
};

// Game state
const game = {
    currentPlayer: 1,
    scores: [0, 0],
    buildings: [],
    gorillas: [],
    banana: null,
    animating: false,
    gravity: 0.15,
    wind: 0,
    playerSettings: [
        { angle: 45, velocity: 100 }, // Player 1
        { angle: 45, velocity: 100 }  // Player 2
    ],
    timeOfDay: 'day', // 'day', 'dawn', or 'night'
    turnsUntilTimeChange: 0,
    turnCount: 0,
    stars: [], // Random star positions
    helicopter: null,
    f16: null,
    seed: 0
};

// ---- Multiplayer (serverless WebRTC) state ----
// net.active: a networked match is running; net.myPlayer: which player (1=host, 2=guest)
// this client controls; sync is thrower-authoritative (see net block near end of file).
const net = {
    active: false,
    connected: false,
    link: null,
    myPlayer: 1,
    iThrew: false,
    pendingOutcome: null,
    awaitingOutcome: false,
    newSeed: 0
};

function isNet() { return net.active && net.connected; }
function isMyTurn() { return game.currentPlayer === net.myPlayer; }

function updateThrowButtonState() {
    const btn = document.getElementById('throwBtn');
    if (!btn) return;
    if (game.animating) { btn.disabled = true; return; }
    btn.disabled = isNet() ? !isMyTurn() : false;
}

const audioEngine = typeof AudioEngine === 'function'
    ? new AudioEngine({
        onStatusChange: (status, detail) => {
            settings.musicStatus = status;
            updateMusicStatusLabel();
            if (detail) {
                console.debug('Audio status detail:', detail);
            }
        },
        onDebug: (event, payload) => {
            console.debug(`[AudioEngine] ${event}`, payload);
        }
    })
    : null;

function updateMusicStatusLabel() {
    const statusElement = document.getElementById('musicStatusValue');
    if (!statusElement) return;

    const map = {
        idle: 'musicStatusIdle',
        generating: 'musicStatusGenerating',
        ready: 'musicStatusReady',
        error: 'musicStatusError'
    };
    statusElement.textContent = t(map[settings.musicStatus] || 'musicStatusIdle');
}

// Building class
class Building {
    constructor(x, width, height) {
        this.x = x;
        this.width = width;
        this.height = height;
        this.color = this.randomBuildingColor();
        this.windows = this.generateWindows();
        this.damages = []; // Store damaged areas {x, y, radius}
    }

    randomBuildingColor() {
        const colors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#8B0000', '#4B0082'];
        return colors[Math.floor(rng() * colors.length)];
    }

    generateWindows() {
        const windows = [];
        const windowWidth = 8;
        const windowHeight = 10;
        const spacing = 15;
        const startY = canvas.height - this.height + 20;

        for (let y = startY; y < canvas.height - 20; y += spacing) {
            for (let x = this.x + 10; x < this.x + this.width - 10; x += spacing) {
                windows.push({
                    x: x,
                    y: y,
                    width: windowWidth,
                    height: windowHeight,
                    lit: rng() > 0.5
                });
            }
        }
        return windows;
    }

    addDamage(x, y) {
        this.damages.push({ x, y, radius: 25 });
    }

    isInDamagedArea(x, y) {
        for (let damage of this.damages) {
            const dx = x - damage.x;
            const dy = y - damage.y;
            if (dx * dx + dy * dy < damage.radius * damage.radius) {
                return true;
            }
        }
        return false;
    }

    drawHeart() {
        // Store original window states if not already stored
        if (!this.originalWindowStates) {
            this.originalWindowStates = this.windows.map(w => ({ ...w }));
        }

        // Turn off all lights first
        this.windows.forEach(window => {
            window.lit = false;
        });

        // Create a heart pattern
        // Windows are spaced 15 pixels apart
        const spacing = 15;
        const cols = Math.floor((this.width - 20) / spacing); // Account for 10px margin on each side
        const rows = Math.floor((this.height - 40) / spacing); // Account for top/bottom margins

        if (cols < 5 || rows < 5) return; // Building too small for heart

        // Heart pattern (1 = lit, 0 = dark) - centered
        const heartPattern = [
            [0, 1, 1, 0, 0, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ];

        const patternHeight = heartPattern.length;
        const patternWidth = heartPattern[0].length;

        // Calculate starting position to center the heart
        const startRow = Math.floor((rows - patternHeight) / 2);
        const startCol = Math.floor((cols - patternWidth) / 2);

        // Map heart pattern to windows
        this.windows.forEach(window => {
            // Calculate which grid cell this window is in (0-based indices)
            const windowCol = Math.round((window.x - this.x - 10) / spacing);
            const windowRow = Math.round((window.y - (canvas.height - this.height + 20)) / spacing);

            // Check if this window position corresponds to a heart pixel
            const patternRow = windowRow - startRow;
            const patternCol = windowCol - startCol;

            if (patternRow >= 0 && patternRow < patternHeight &&
                patternCol >= 0 && patternCol < patternWidth) {
                window.lit = heartPattern[patternRow][patternCol] === 1;
            }
        });
    }

    restoreWindows() {
        // Restore original window states
        if (this.originalWindowStates) {
            this.windows.forEach((window, index) => {
                window.lit = this.originalWindowStates[index].lit;
            });
            this.originalWindowStates = null;
        }
    }

    draw() {
        ctx.save();

        // Create clipping path: building shape minus damage holes
        ctx.beginPath();
        ctx.rect(this.x, canvas.height - this.height, this.width, this.height);

        // Subtract damage holes from the clipping region
        if (this.damages.length > 0) {
            this.damages.forEach(damage => {
                ctx.arc(damage.x, damage.y, damage.radius, 0, Math.PI * 2, true);
            });
        }

        ctx.clip('evenodd');

        // Draw building within the clipped region
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, canvas.height - this.height, this.width, this.height);

        // Draw windows (skip if in damaged area)
        this.windows.forEach(window => {
            if (!this.isInDamagedArea(window.x + window.width / 2, window.y + window.height / 2)) {
                let windowColor;
                if (settings.blinkingLights) {
                    // Blinking effect - toggle every 500ms
                    const currentTime = Date.now();
                    if (currentTime - settings.lastBlinkTime >= 500) {
                        settings.blinkState = !settings.blinkState;
                        settings.lastBlinkTime = currentTime;
                    }
                    // Invert the window state based on blink state
                    const isLit = settings.blinkState ? !window.lit : window.lit;
                    windowColor = isLit ? '#FFFF00' : '#333333';
                } else {
                    windowColor = window.lit ? '#FFFF00' : '#333333';
                }
                ctx.fillStyle = windowColor;
                ctx.fillRect(window.x, window.y, window.width, window.height);
            }
        });

        ctx.restore();
    }
}

// Gorilla class
class Gorilla {
    constructor(x, y, player) {
        this.x = x;
        this.y = y;
        this.player = player;
        this.width = 40;
        this.height = 50;
        this.destroyed = false;
        this.astonished = false;
        this.astonishedTimer = 0;
    }

    draw() {
        if (this.destroyed) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw a much simpler, cleaner gorilla silhouette
        // Base color - dark charcoal
        const baseColor = '#2a2a2a';
        const darkColor = '#1a1a1a';
        const highlightColor = '#3d3d3d';

        // Body - simple rounded rectangle shape
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Chest highlight
        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.ellipse(0, 2, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head - simple circle
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(0, -25, 12, 0, Math.PI * 2);
        ctx.fill();

        // Face area
        ctx.fillStyle = highlightColor;
        ctx.beginPath();
        ctx.ellipse(0, -24, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arms - simple thick lines
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-12, -5);
        ctx.lineTo(-20, 5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(12, -5);
        ctx.lineTo(20, 5);
        ctx.stroke();

        // Hands
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(-20, 5, 4, 0, Math.PI * 2);
        ctx.arc(20, 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 8;

        ctx.beginPath();
        ctx.moveTo(-6, 18);
        ctx.lineTo(-6, 28);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(6, 18);
        ctx.lineTo(6, 28);
        ctx.stroke();

        // Feet
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.ellipse(-6, 28, 6, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(6, 28, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(-10, -25, 4, 0, Math.PI * 2);
        ctx.arc(10, -25, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eyes - simple white dots
        if (this.astonished) {
            // Wide open astonished eyes
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-4, -26, 3, 0, Math.PI * 2);
            ctx.arc(4, -26, 3, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-4, -26, 1.5, 0, Math.PI * 2);
            ctx.arc(4, -26, 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Normal eyes - just white dots
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(-4, -26, 2, 0, Math.PI * 2);
            ctx.arc(4, -26, 2, 0, Math.PI * 2);
            ctx.fill();

            // Small pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-4, -26, 1, 0, Math.PI * 2);
            ctx.arc(4, -26, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mouth - simple and minimal
        if (this.astonished) {
            // Open mouth (O shape - astonished)
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.ellipse(0, -21, 2, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Small smile line
            ctx.strokeStyle = darkColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, -22, 3, 0.3, Math.PI - 0.3);
            ctx.stroke();
        }

        ctx.restore();
    }

    throwBanana(angle, velocity, player) {
        const radian = (angle * Math.PI) / 180;
        // Player 1 throws right (+1), Player 2 throws left (-1)
        const direction = player === 1 ? 1 : -1;

        return {
            x: this.x,
            y: this.y - 35,
            // For Player 2, flip the angle so same input throws in opposite direction
            vx: Math.cos(radian) * velocity / 10 * direction,
            vy: -Math.sin(radian) * velocity / 10,
            trail: []
        };
    }

    checkHit(x, y, radius) {
        const dx = x - this.x;
        const dy = y - (this.y - 25);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < radius + 20;
    }
}

// Banana/Projectile class
class Banana {
    constructor(x, y, vx, vy, thrower) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.trail = [];
        this.active = true;
        this.thrower = thrower; // Track who threw the banana
        this.rotation = 0; // Rotation angle for spinning effect
    }

    update() {
        // Add wind effect
        this.vx += game.wind * 0.01;

        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 20) {
            this.trail.shift();
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Apply gravity
        this.vy += game.gravity;

        // Spin the banana based on velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.rotation += speed * 0.1;

        // Check boundaries
        if (this.x < 0 || this.x > canvas.width || this.y > canvas.height) {
            this.active = false;
            return 'miss';
        }

        // Check collision with buildings (but not damaged areas)
        for (let building of game.buildings) {
            if (this.x >= building.x &&
                this.x <= building.x + building.width &&
                this.y >= canvas.height - building.height) {

                // Check if hitting a damaged area (hole) - if so, banana passes through
                if (building.isInDamagedArea(this.x, this.y)) {
                    continue; // Pass through the hole
                }

                this.active = false;
                return { type: 'building', building: building, x: this.x, y: this.y };
            }
        }

        // Check collision with gorillas (but not the one who threw it)
        for (let gorilla of game.gorillas) {
            if (!gorilla.destroyed && gorilla.player !== this.thrower) {
                const distance = Math.sqrt(
                    Math.pow(this.x - gorilla.x, 2) +
                    Math.pow(this.y - (gorilla.y - 25), 2)
                );

                // Direct hit
                if (distance < 35) {
                    this.active = false;
                    // Cosmetic bananas (remote-throw replay) must not mutate game state;
                    // the authoritative outcome message decides the result.
                    if (this.cosmetic) return 'cosmeticDone';
                    gorilla.destroyed = true;
                    return gorilla.player;
                }

                // Near miss (close but not hit) - make gorilla astonished
                if (!this.cosmetic && distance < 60 && !gorilla.astonished) {
                    gorilla.astonished = true;
                    gorilla.astonishedTimer = 120; // Stay astonished for ~2 seconds
                }
            }
        }

        return 'flying';
    }

    draw() {
        // Draw trail
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length - 1; i++) {
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
        }
        ctx.stroke();

        // Draw realistic spinning banana with more curve
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Scale to make banana bigger
        ctx.scale(1.3, 1.3);

        // Draw banana body (more curved crescent shape)
        ctx.fillStyle = '#FFE135';
        ctx.strokeStyle = '#E8B923';
        ctx.lineWidth = 1;

        ctx.beginPath();
        // Create more pronounced curved banana shape
        // Top curve (outer edge)
        ctx.moveTo(-15, 3);
        ctx.bezierCurveTo(-12, -8, -4, -12, 6, -10);
        ctx.bezierCurveTo(12, -8, 16, -3, 16, 2);

        // Right tip
        ctx.lineTo(16, 3);

        // Bottom curve (inner edge) - creates the crescent
        ctx.bezierCurveTo(14, 0, 8, -3, 4, -4);
        ctx.bezierCurveTo(-2, -5, -10, -2, -14, 5);

        // Left tip
        ctx.lineTo(-15, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner shadow for depth
        ctx.fillStyle = 'rgba(200, 160, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(-13, 4);
        ctx.bezierCurveTo(-10, -1, -3, -4, 4, -3);
        ctx.bezierCurveTo(8, -2, 12, 0, 14, 2);
        ctx.lineTo(14, 3);
        ctx.bezierCurveTo(12, 1, 7, -1, 3, -2);
        ctx.bezierCurveTo(-3, -3, -9, 0, -13, 4);
        ctx.closePath();
        ctx.fill();

        // Highlight on top edge
        ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-6, -5, 4, 1.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(4, -6, 3, 1.2, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Brown spots
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(-8, -2, 1.2, 0, Math.PI * 2);
        ctx.arc(-2, -4, 0.9, 0, Math.PI * 2);
        ctx.arc(6, -5, 1, 0, Math.PI * 2);
        ctx.arc(10, -4, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Banana stem (more detailed)
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 3);
        ctx.quadraticCurveTo(-17, 1, -18, -1);
        ctx.stroke();

        // Stem tip
        ctx.fillStyle = '#4a2511';
        ctx.beginPath();
        ctx.arc(-18, -1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Explosion class
class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.frame = 0;

        // Create explosion particles
        for (let i = 0; i < 60; i++) {
            const angle = (Math.PI * 2 * i) / 60;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * (2 + Math.random() * 3),
                vy: Math.sin(angle) * (2 + Math.random() * 3),
                life: 30 + Math.random() * 20
            });
        }
    }

    update() {
        this.frame++;
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life--;
        });
        this.particles = this.particles.filter(p => p.life > 0);
    }

    draw() {
        this.particles.forEach(p => {
            const alpha = p.life / 50;
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    isDone() {
        return this.particles.length === 0;
    }
}

// Helicopter class
class Helicopter {
    constructor() {
        this.direction = Math.random() > 0.5 ? 1 : -1; // 1 = left to right, -1 = right to left
        this.x = this.direction === 1 ? -100 : canvas.width + 100;
        this.y = 60 + Math.random() * 80; // Random altitude
        this.speed = 2 + Math.random() * 1.5;
        this.rotorAngle = 0;
    }

    update() {
        this.x += this.speed * this.direction;
        this.rotorAngle += 0.5;

        // Remove helicopter when it leaves screen
        if (this.direction === 1 && this.x > canvas.width + 100) {
            return false;
        }
        if (this.direction === -1 && this.x < -100) {
            return false;
        }
        return true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Flip if flying right to left
        if (this.direction === -1) {
            ctx.scale(-1, 1);
        }

        // Helicopter body
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-20, -5, 40, 12);

        // Cockpit
        ctx.fillStyle = '#2a4a6a';
        ctx.beginPath();
        ctx.ellipse(8, 0, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-35, -2);
        ctx.stroke();

        // Tail rotor
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-35, -6);
        ctx.lineTo(-35, 2);
        ctx.stroke();

        // Landing skids
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-15, 7);
        ctx.lineTo(-15, 12);
        ctx.lineTo(15, 12);
        ctx.lineTo(15, 7);
        ctx.stroke();

        // Main rotor (spinning)
        ctx.save();
        ctx.translate(0, -8);
        ctx.rotate(this.rotorAngle);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(25, 0);
        ctx.moveTo(0, -25);
        ctx.lineTo(0, 25);
        ctx.stroke();
        ctx.restore();

        // Police light (blinking)
        if (Math.floor(this.rotorAngle) % 2 === 0) {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(-5, -2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0000FF';
            ctx.beginPath();
            ctx.arc(5, -2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

// F-16 Fighter Jet class
class F16 {
    constructor() {
        this.direction = Math.random() > 0.5 ? 1 : -1; // 1 = left to right, -1 = right to left
        this.x = this.direction === 1 ? -150 : canvas.width + 150;
        this.y = 40 + Math.random() * 60; // Higher altitude than helicopter
        this.speed = 5 + Math.random() * 3; // Faster than helicopter
        this.afterburnerFlicker = 0;
        this.exhaustParticles = [];
    }

    update() {
        this.x += this.speed * this.direction;
        this.afterburnerFlicker += 0.3;

        // Create exhaust particles for afterburner trail
        if (Math.random() > 0.3) {
            this.exhaustParticles.push({
                x: this.x - (this.direction * 30),
                y: this.y + 2,
                life: 20 + Math.random() * 10,
                size: 3 + Math.random() * 4,
                speedX: -this.direction * (Math.random() * 0.5),
                speedY: (Math.random() - 0.5) * 0.5
            });
        }

        // Update and remove old exhaust particles
        this.exhaustParticles = this.exhaustParticles.filter(p => {
            p.life--;
            p.x += p.speedX;
            p.y += p.speedY;
            p.size *= 0.95;
            return p.life > 0;
        });

        // Remove F-16 when it leaves screen
        if (this.direction === 1 && this.x > canvas.width + 150) {
            return false;
        }
        if (this.direction === -1 && this.x < -150) {
            return false;
        }
        return true;
    }

    draw() {
        // Draw exhaust particles (afterburner trail)
        this.exhaustParticles.forEach(p => {
            const alpha = p.life / 30;
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(255, 50, 0, 0)`);
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.save();
        ctx.translate(this.x, this.y);

        // Flip if flying right to left
        if (this.direction === -1) {
            ctx.scale(-1, 1);
        }

        // F-16 body (main fuselage)
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(-25, -2);
        ctx.lineTo(-30, 0);
        ctx.lineTo(-25, 2);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#1a3a5a';
        ctx.beginPath();
        ctx.ellipse(15, 0, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit reflection
        ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(17, -1, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings (delta wing design)
        ctx.fillStyle = '#5a5a5a';
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-10, -15);
        ctx.lineTo(-15, -15);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(-10, 15);
        ctx.lineTo(-15, 15);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();

        // Tail fins
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(-28, -8);
        ctx.lineTo(-25, 0);
        ctx.closePath();
        ctx.fill();

        // Engine exhaust (bright afterburner)
        const flicker = Math.sin(this.afterburnerFlicker) * 0.3 + 0.7;
        const exhaustGradient = ctx.createRadialGradient(-30, 0, 0, -30, 0, 8);
        exhaustGradient.addColorStop(0, `rgba(255, 255, 200, ${flicker})`);
        exhaustGradient.addColorStop(0.3, `rgba(255, 150, 50, ${flicker * 0.8})`);
        exhaustGradient.addColorStop(0.7, `rgba(255, 100, 0, ${flicker * 0.5})`);
        exhaustGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = exhaustGradient;
        ctx.beginPath();
        ctx.arc(-30, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Nose cone
        ctx.fillStyle = '#3a3a3a';
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(35, -1);
        ctx.lineTo(35, 1);
        ctx.closePath();
        ctx.fill();

        // Wing details (missiles/fuel tanks)
        ctx.fillStyle = '#666';
        ctx.fillRect(-8, -12, 6, 2);
        ctx.fillRect(-8, 10, 6, 2);

        ctx.restore();
    }
}

// Get sky colors based on time of day
function getSkyColors() {
    switch (game.timeOfDay) {
        case 'day':
            return {
                top: '#87CEEB',
                bottom: '#E0F6FF',
                sunMoon: '#FFD700',
                sunMoonRadius: 40,
                sunMoonX: 100,
                sunMoonY: 80
            };
        case 'dawn':
            return {
                top: '#FF6B6B',
                bottom: '#FFD93D',
                sunMoon: '#FF8C42',
                sunMoonRadius: 35,
                sunMoonX: 150,
                sunMoonY: 120
            };
        case 'night':
            return {
                top: '#0B1026',
                bottom: '#1a1a3e',
                sunMoon: '#F0E68C',
                sunMoonRadius: 35,
                sunMoonX: 900,
                sunMoonY: 70
            };
        default:
            return getSkyColors.day;
    }
}

// Initialize game
function initGame(seed) {
    // Seed the RNG so the skyline, wind and stars are reproducible from `seed`.
    // Single-player passes no seed and gets a fresh random one each round.
    game.seed = (seed == null) ? ((Math.random() * 1e9) | 0) : (seed >>> 0);
    seedRng(game.seed);

    game.buildings = [];
    game.gorillas = [];
    game.banana = null; // Clear any existing banana
    game.currentPlayer = 1;
    game.wind = (rng() - 0.5) * 4;
    game.turnCount = 0;

    // Set random turns until time change (between 1 and half max score)
    game.turnsUntilTimeChange = Math.floor(rng() * 5) + 2;

    // Generate random star positions (used for night sky)
    game.stars = [];
    for (let i = 0; i < 50; i++) {
        game.stars.push({
            x: rng() * canvas.width,
            y: rng() * (canvas.height / 2),
            size: 0.5 + rng() * 1.5,
            twinkle: rng() * Math.PI * 2
        });
    }

    // Generate random buildings
    let x = 0;
    while (x < canvas.width) {
        const width = 60 + rng() * 60;
        const height = 100 + rng() * 250;
        game.buildings.push(new Building(x, width, height));
        x += width + 10;
    }

    // Place gorillas on buildings (standing on top)
    const building1 = game.buildings[Math.floor(game.buildings.length * 0.2)];
    const building2 = game.buildings[Math.floor(game.buildings.length * 0.8)];

    // Offset by 28 pixels so feet are on the roof (feet are at y+28 in draw function)
    game.gorillas.push(new Gorilla(
        building1.x + building1.width / 2,
        canvas.height - building1.height - 28,
        1
    ));

    game.gorillas.push(new Gorilla(
        building2.x + building2.width / 2,
        canvas.height - building2.height - 28,
        2
    ));

    updateGameInfo();
    updateThrowButtonState();
    if (settings.musicEnabled && audioEngine && audioEngine.hasLoop()) {
        audioEngine.playLoop();
    }
    draw();
}

// Draw everything
function draw() {
    const skyColors = getSkyColors();

    // Clear canvas with sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, skyColors.top);
    gradient.addColorStop(1, skyColors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw sun/moon
    ctx.fillStyle = skyColors.sunMoon;
    ctx.beginPath();
    ctx.arc(skyColors.sunMoonX, skyColors.sunMoonY, skyColors.sunMoonRadius, 0, Math.PI * 2);
    ctx.fill();

    // Add moon craters if night
    if (game.timeOfDay === 'night') {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(skyColors.sunMoonX - 10, skyColors.sunMoonY - 8, 8, 0, Math.PI * 2);
        ctx.arc(skyColors.sunMoonX + 8, skyColors.sunMoonY - 5, 5, 0, Math.PI * 2);
        ctx.arc(skyColors.sunMoonX + 5, skyColors.sunMoonY + 10, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw stars with natural random positions and twinkling
        game.stars.forEach((star, index) => {
            const twinkle = Math.sin(star.twinkle + Date.now() / 500 + index) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Draw buildings
    game.buildings.forEach(building => building.draw());

    // Draw helicopter if exists
    if (game.helicopter) {
        game.helicopter.draw();
    }

    // Draw F-16 if exists
    if (game.f16) {
        game.f16.draw();
    }

    // Draw gorillas
    game.gorillas.forEach(gorilla => gorilla.draw());

    // Draw banana if exists
    if (game.banana) {
        game.banana.draw();
    }

    // Draw helping mode trajectory if enabled
    if (settings.helpingMode && !game.animating) {
        drawHelpingTrajectory();
    }
}

// Draw animated helping trajectory
function drawHelpingTrajectory() {
    const angle = parseInt(document.getElementById('angle').value) || 45;
    const velocity = parseInt(document.getElementById('velocity').value) || 100;

    if (angle < 0 || angle > 180 || velocity < 10 || velocity > 200) {
        return; // Invalid values
    }

    const gorilla = game.gorillas[game.currentPlayer - 1];
    const throwData = gorilla.throwBanana(angle, velocity, game.currentPlayer);

    // Calculate trajectory points
    const points = [];
    let x = throwData.x;
    let y = throwData.y;
    let vx = throwData.vx;
    let vy = throwData.vy;
    const maxSteps = 300;

    for (let i = 0; i < maxSteps; i++) {
        points.push({ x, y });

        // Apply wind and gravity (same as actual banana physics)
        vx += game.wind * 0.01;
        vy += game.gravity;

        // Update position
        x += vx;
        y += vy;

        // Stop if out of bounds
        if (y > canvas.height || x < 0 || x > canvas.width) {
            break;
        }

        // Stop if hit building
        let hitBuilding = false;
        for (let building of game.buildings) {
            if (x >= building.x && x <= building.x + building.width &&
                y >= canvas.height - building.height) {
                if (!building.isInDamagedArea(x, y)) {
                    hitBuilding = true;
                    break;
                }
            }
        }
        if (hitBuilding) break;

        // Stop if hit gorilla
        for (let otherGorilla of game.gorillas) {
            if (otherGorilla.player !== game.currentPlayer) {
                const dx = x - otherGorilla.x;
                const dy = y - otherGorilla.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 20) {
                    hitBuilding = true;
                    break;
                }
            }
        }
        if (hitBuilding) break;
    }

    // Animate the trajectory drawing
    const currentTime = Date.now();
    if (currentTime - settings.lastTrajectoryUpdate >= 20) {
        settings.trajectoryProgress += 2;
        if (settings.trajectoryProgress >= points.length) {
            settings.trajectoryProgress = 0;
        }
        settings.lastTrajectoryUpdate = currentTime;
    }

    // Draw the trajectory up to current progress
    if (points.length > 1) {
        ctx.save();
        // Color based on time of day: black during day, yellow during night
        const lineColor = game.timeOfDay === 'night' ? 'rgba(255, 255, 0, 0.8)' : 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        const endIndex = Math.min(settings.trajectoryProgress, points.length);
        for (let i = 1; i < endIndex; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

// Continuous animation loop for background elements (helicopter, F-16)
function updateBackground() {
    // Update helicopter if exists
    if (game.helicopter) {
        const stillActive = game.helicopter.update();
        if (!stillActive) {
            game.helicopter = null;
        }
    }

    // Update F-16 if exists
    if (game.f16) {
        const stillActive = game.f16.update();
        if (!stillActive) {
            game.f16 = null;
        }
    }

    // Update gorilla astonished timers
    game.gorillas.forEach(gorilla => {
        if (gorilla.astonished && gorilla.astonishedTimer > 0) {
            gorilla.astonishedTimer--;
            if (gorilla.astonishedTimer === 0) {
                gorilla.astonished = false;
            }
        }
    });

    // Random chance to spawn helicopter (about every 10-20 seconds)
    if (!game.helicopter && Math.random() < 0.002) {
        game.helicopter = new Helicopter();
    }

    // Random chance to spawn F-16 (less frequent, about every 15-30 seconds)
    if (!game.f16 && Math.random() < 0.0015) {
        game.f16 = new F16();
    }

    // Redraw if not animating (so aircraft move even when idle)
    if (!game.animating) {
        draw();
    }

    requestAnimationFrame(updateBackground);
}

// Animation loop for banana
function animate() {
    if (!game.animating) return;

    const result = game.banana.update();
    draw();

    if (result === 'flying') {
        requestAnimationFrame(animate);
    } else {
        handleBananaResult(result);
    }
}

// Handle banana result (runs on the thrower). In a networked match the thrower is
// authoritative: it broadcasts the resolved outcome so the peer applies identical state.
function handleBananaResult(result) {
    const amThrower = isNet() && net.iThrew;

    if (result === 1 || result === 2) {
        // Hit a gorilla!
        const bx = game.banana.x, by = game.banana.y;
        const explosion = new Explosion(bx, by);
        const winner = result === 1 ? 2 : 1;
        const nextScores = game.scores.slice();
        nextScores[winner - 1]++;

        if (amThrower) {
            net.newSeed = (Math.random() * 1e9) | 0;
            net.iThrew = false;
            netSend({ ty: 'outcome', kind: 'gorilla', ix: bx, iy: by,
                loser: result, winner, scores: nextScores, seed: net.newSeed });
        }

        // Clear banana immediately after hit
        game.banana = null;

        function explode() {
            draw();
            explosion.update();
            explosion.draw();

            if (!explosion.isDone()) {
                requestAnimationFrame(explode);
            } else {
                game.scores[winner - 1]++;
                updateScores();
                showMessage(t('winsRound', {player: winner}));
                setTimeout(() => {
                    initGame(isNet() ? net.newSeed : undefined);
                    game.animating = false;
                    updateThrowButtonState();
                }, 2000);
            }
        }
        explode();
    } else if (result.type === 'building') {
        // Hit a building - show explosion and damage
        const explosion = new Explosion(result.x, result.y);
        const nextPlayer = game.currentPlayer === 1 ? 2 : 1;

        // Add damage to the building (only if setting is enabled)
        if (settings.destroyBuildings) {
            result.building.addDamage(result.x, result.y);
        }

        if (amThrower) {
            net.iThrew = false;
            netSend({ ty: 'outcome', kind: 'building', ix: result.x, iy: result.y,
                bIdx: game.buildings.indexOf(result.building),
                damaged: !!settings.destroyBuildings, currentPlayer: nextPlayer });
        }

        // Clear banana immediately after hit
        game.banana = null;

        function explode() {
            draw();
            explosion.update();
            explosion.draw();

            if (!explosion.isDone()) {
                requestAnimationFrame(explode);
            } else {
                // Switch player after explosion
                showMessage(t('hitBuilding'));
                game.currentPlayer = nextPlayer;

                setTimeout(() => {
                    game.animating = false;
                    updateGameInfo();
                    updateThrowButtonState();
                }, 500);
            }
        }
        explode();
    } else {
        // Miss - switch player
        const nextPlayer = game.currentPlayer === 1 ? 2 : 1;
        if (amThrower) {
            net.iThrew = false;
            netSend({ ty: 'outcome', kind: 'miss', currentPlayer: nextPlayer });
        }
        showMessage(t('missed'));
        game.currentPlayer = nextPlayer;

        setTimeout(() => {
            game.animating = false;
            updateGameInfo();
            updateThrowButtonState();
        }, 1000);
    }
}

// Advance time of day cycle
function advanceTimeOfDay() {
    game.turnCount++;

    if (game.turnCount >= game.turnsUntilTimeChange) {
        game.turnCount = 0;
        game.turnsUntilTimeChange = Math.floor(Math.random() * 5) + 2;

        // Cycle through: day -> dawn -> night -> day
        switch (game.timeOfDay) {
            case 'day':
                game.timeOfDay = 'dawn';
                showMessage(t('dawnBreaking'));
                break;
            case 'dawn':
                game.timeOfDay = 'night';
                showMessage(t('nightFallen'));
                break;
            case 'night':
                game.timeOfDay = 'day';
                showMessage(t('newDayBegins'));
                break;
        }

        draw(); // Redraw with new sky
    }
}

// Update game info
function updateGameInfo() {
    document.getElementById('currentPlayer').textContent = t('playerTurn', {player: game.currentPlayer});
    const windText = game.wind > 0 ? `${t('wind')} ${game.wind.toFixed(1)} →` : `${t('wind')} ← ${Math.abs(game.wind).toFixed(1)}`;
    document.getElementById('gameMessage').textContent = windText;

    // Restore player's saved settings
    const playerSettings = game.playerSettings[game.currentPlayer - 1];
    document.getElementById('angle').value = playerSettings.angle;
    document.getElementById('velocity').value = playerSettings.velocity;

    updateNetStatus();
}

// Save current player settings
function savePlayerSettings() {
    const angle = parseInt(document.getElementById('angle').value);
    const velocity = parseInt(document.getElementById('velocity').value);
    game.playerSettings[game.currentPlayer - 1] = { angle, velocity };
}

// Show message
function showMessage(text) {
    document.getElementById('gameMessage').textContent = text;
}

// Update scores
function updateScores() {
    document.getElementById('score1').textContent = game.scores[0];
    document.getElementById('score2').textContent = game.scores[1];
}

async function ensureAudioReady() {
    if (!audioEngine) {
        settings.musicStatus = 'error';
        updateMusicStatusLabel();
        showMessage(t('musicNotSupported'));
        return false;
    }

    try {
        await audioEngine.resumeFromGesture();
        return true;
    } catch (error) {
        settings.musicStatus = 'error';
        updateMusicStatusLabel();
        showMessage(t('musicNotSupported'));
        console.error('Audio resume failed:', error);
        return false;
    }
}

async function generateAndPlayMusic() {
    const generateButton = document.getElementById('generateMusicBtn');
    if (!settings.musicEnabled) {
        showMessage(t('musicDisabled'));
        return;
    }

    if (!(await ensureAudioReady())) {
        return;
    }

    if (generateButton) {
        generateButton.disabled = true;
    }

    settings.musicGenerateClickCount += 1;
    settings.musicStatus = 'generating';
    updateMusicStatusLabel();

    try {
        const generatedTempo = 110 + Math.floor(Math.random() * 51);
        const playPublicDomainMelody = settings.musicGenerateClickCount % 5 === 0
            && typeof audioEngine.generatePublicDomainLoop === 'function';
        const loop = playPublicDomainMelody
            ? audioEngine.generatePublicDomainLoop({
                soundProfile: settings.selectedSoundProfile,
                bars: 8,
                tempo: 122
            })
            : await audioEngine.generateLoop({
                soundProfile: settings.selectedSoundProfile,
                bars: 8,
                tempo: generatedTempo,
                seed: `${Date.now()}-${Math.random()}`
            });
        audioEngine.stopLoop();
        audioEngine.playLoop(loop);
        settings.musicStatus = 'ready';
        showMessage(t('musicGenerationReady'));
    } catch (error) {
        settings.musicStatus = 'error';
        settings.musicEnabled = false;
        document.getElementById('musicToggle').checked = false;
        if (audioEngine) {
            audioEngine.stopLoop();
        }
        const detail = error && error.message ? ` (${error.message})` : '';
        showMessage(`${t('musicGenerationFailed')}${detail}`);
        console.error('Music generation failed:', error);
    } finally {
        updateMusicStatusLabel();
        if (generateButton) {
            generateButton.disabled = false;
        }
    }
}

// Calculate hint - find angle and velocity to hit opponent
function calculateHint() {
    const thrower = game.gorillas[game.currentPlayer - 1];
    const target = game.gorillas[game.currentPlayer === 1 ? 1 : 0];

    const direction = game.currentPlayer === 1 ? 1 : -1;

    // Both players use the same angle range (0-90°)
    const angleStart = 20;
    const angleEnd = 80;

    let bestSolution = null;
    let bestDistance = Infinity;

    // Try different angles to find a good solution
    for (let angle = angleStart; angle <= angleEnd; angle += 2) {
        const radian = (angle * Math.PI) / 180;

        // Try different velocities
        for (let vel = 50; vel <= 200; vel += 5) {
            const v = vel / 10;
            const vx = Math.cos(radian) * v * direction;
            const vy = -Math.sin(radian) * v;

            // Simulate trajectory exactly like the real banana flight
            let x = thrower.x;
            let y = thrower.y - 35;
            let vxCurrent = vx;
            let vyCurrent = vy;
            let closestDist = Infinity;

            for (let t = 0; t < 300; t++) {
                // Apply wind exactly like in Banana.update()
                vxCurrent += game.wind * 0.01;

                // Update position
                x += vxCurrent;
                y += vyCurrent;

                // Apply gravity
                vyCurrent += game.gravity;

                // Check distance to target
                const distToTarget = Math.sqrt(Math.pow(x - target.x, 2) + Math.pow(y - (target.y - 25), 2));

                if (distToTarget < closestDist) {
                    closestDist = distToTarget;
                }

                // Direct hit!
                if (distToTarget < 25) {
                    return { angle: angle, velocity: vel };
                }

                // Stop if out of bounds
                if (x < 0 || x > canvas.width || y > canvas.height) {
                    break;
                }

                // Check if we hit a building (skip this solution)
                let hitBuilding = false;
                for (let building of game.buildings) {
                    if (x >= building.x &&
                        x <= building.x + building.width &&
                        y >= canvas.height - building.height) {
                        hitBuilding = true;
                        break;
                    }
                }
                if (hitBuilding) break;
            }

            // Track the best near-miss
            if (closestDist < bestDistance) {
                bestDistance = closestDist;
                bestSolution = { angle: angle, velocity: vel };
            }
        }
    }

    // Return best solution found, or fallback
    if (bestSolution && bestDistance < 100) {
        return bestSolution;
    }

    // Fallback: return reasonable values (same for both players)
    return {
        angle: 45,
        velocity: 100
    };
}

// Event listeners
document.getElementById('throwBtn').addEventListener('click', () => {
    if (game.animating) return;
    if (isNet() && !isMyTurn()) { showMessage(t('netNotYourTurn')); return; }
    ensureAudioReady();

    const angle = parseInt(document.getElementById('angle').value);
    const velocity = parseInt(document.getElementById('velocity').value);

    if (angle < 0 || angle > 180 || velocity < 10 || velocity > 200) {
        showMessage(t('invalidInput'));
        return;
    }

    // Advance time of day cycle before throwing
    advanceTimeOfDay();

    // Save the current player's settings before throwing
    savePlayerSettings();

    // Broadcast the throw so the peer replays it (time-of-day is synced along with it).
    if (isNet()) {
        net.iThrew = true;
        netSend({ ty: 'throw', angle, velocity, tod: game.timeOfDay });
    }

    const gorilla = game.gorillas[game.currentPlayer - 1];
    const bananaData = gorilla.throwBanana(angle, velocity, game.currentPlayer);

    // Clear previous banana and redraw before starting new throw
    game.banana = null;
    draw();

    game.banana = new Banana(bananaData.x, bananaData.y, bananaData.vx, bananaData.vy, game.currentPlayer);
    game.animating = true;
    document.getElementById('throwBtn').disabled = true;
    showMessage(t('bananaInFlight'));

    animate();
});

document.getElementById('hintBtn').addEventListener('click', () => {
    if (game.animating) return;

    const hint = calculateHint();
    document.getElementById('angle').value = hint.angle;
    document.getElementById('velocity').value = hint.velocity;
    showMessage(t('hintMessage', {angle: hint.angle, velocity: hint.velocity}));
});

document.getElementById('resetBtn').addEventListener('click', () => {
    if (game.animating) return;
    game.scores = [0, 0];
    updateScores();
    if (!settings.musicEnabled && audioEngine) {
        audioEngine.stopLoop();
    }
    if (settings.musicEnabled && audioEngine && audioEngine.hasLoop()) {
        audioEngine.playLoop();
    }
    // In a networked match either side may start a fresh game; broadcast the seed
    // so both peers build the identical skyline and reset scores together.
    if (isNet()) {
        const seed = (Math.random() * 1e9) | 0;
        game.timeOfDay = 'day';
        netSend({ ty: 'newgame', seed, scores: [0, 0], destroy: !!settings.destroyBuildings });
        initGame(seed);
    } else {
        initGame();
    }
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (settings.musicEnabled) {
        ensureAudioReady();
    }
    if (e.key === 'Enter' && !game.animating) {
        document.getElementById('throwBtn').click();
    }

    // Toggle blinking lights with 'b' key
    if (e.key === 'b' || e.key === 'B') {
        settings.blinkingLights = !settings.blinkingLights;
        draw(); // Redraw to show change
    }

    // Toggle day/night with 'n' key (disabled in multiplayer: would desync the peers)
    if ((e.key === 'n' || e.key === 'N') && !isNet()) {
        // Toggle between day and night
        if (game.timeOfDay === 'day') {
            game.timeOfDay = 'night';
        } else {
            game.timeOfDay = 'day';
        }
        draw(); // Redraw to show change
    }

    // Toggle heart on widest building with 'h' key
    if (e.key === 'h' || e.key === 'H') {
        if (settings.heartActive) {
            // Restore original lights
            if (settings.heartBuilding) {
                settings.heartBuilding.restoreWindows();
            }
            settings.heartActive = false;
            settings.heartBuilding = null;
        } else {
            // Find the widest building
            let widestBuilding = game.buildings[0];
            game.buildings.forEach(building => {
                if (building.width > widestBuilding.width) {
                    widestBuilding = building;
                }
            });

            // Draw heart on widest building
            widestBuilding.drawHeart();
            settings.heartActive = true;
            settings.heartBuilding = widestBuilding;
        }
        draw(); // Redraw to show the change
    }

    // Toggle helping mode with 't' key
    if (e.key === 't' || e.key === 'T') {
        settings.helpingMode = !settings.helpingMode;
        if (!settings.helpingMode) {
            settings.trajectoryProgress = 0; // Reset animation
        }
        // Update checkbox in settings if modal is open
        document.getElementById('helpingModeToggle').checked = settings.helpingMode;
        draw(); // Redraw to show the change
    }

    // Switch players with 'p' key (disabled in multiplayer: turn order is authoritative)
    if ((e.key === 'p' || e.key === 'P') && !isNet()) {
        if (!game.animating) {
            game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
            updateGameInfo();
            draw(); // Redraw to show the change
        }
    }

    // Toggle astonished eyes with 'e' key
    if (e.key === 'e' || e.key === 'E') {
        game.gorillas.forEach(gorilla => {
            gorilla.astonished = !gorilla.astonished;
        });
        draw(); // Redraw to show the change
    }

    // Generate new skyline with 'g' key (disabled in multiplayer; use New Game to resync)
    if ((e.key === 'g' || e.key === 'G') && !isNet()) {
        if (!game.animating) {
            // Reset heart if active
            if (settings.heartActive && settings.heartBuilding) {
                settings.heartBuilding.restoreWindows();
                settings.heartActive = false;
                settings.heartBuilding = null;
            }
            // Generate new buildings and gorilla positions
            initGame();
        }
    }

    // Toggle music with 'm' key
    if (e.key === 'm' || e.key === 'M') {
        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.checked = !musicToggle.checked;
            musicToggle.dispatchEvent(new Event('change'));
        }
    }
});

// Language switching function
function updateUILanguage() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    // Update dynamic game messages
    updateGameInfo();
    updateMusicStatusLabel();
}

// Language switcher event listeners
document.getElementById('langDE').addEventListener('click', () => {
    currentLanguage = 'de';
    document.getElementById('langDE').classList.add('active');
    document.getElementById('langEN').classList.remove('active');
    document.getElementById('langHU').classList.remove('active');
    document.documentElement.lang = 'de';
    updateUILanguage();
});

document.getElementById('langEN').addEventListener('click', () => {
    currentLanguage = 'en';
    document.getElementById('langEN').classList.add('active');
    document.getElementById('langDE').classList.remove('active');
    document.getElementById('langHU').classList.remove('active');
    document.documentElement.lang = 'en';
    updateUILanguage();
});

document.getElementById('langHU').addEventListener('click', () => {
    currentLanguage = 'hu';
    document.getElementById('langHU').classList.add('active');
    document.getElementById('langDE').classList.remove('active');
    document.getElementById('langEN').classList.remove('active');
    document.documentElement.lang = 'hu';
    updateUILanguage();
});

// Settings modal
document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.add('show');
    document.getElementById('destroyBuildingToggle').checked = settings.destroyBuildings;
    document.getElementById('helpingModeToggle').checked = settings.helpingMode;
    document.getElementById('musicToggle').checked = settings.musicEnabled;
    document.getElementById('musicProfileSelect').value = settings.selectedSoundProfile;
    updateMusicStatusLabel();
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('show');
});

document.getElementById('destroyBuildingToggle').addEventListener('change', (e) => {
    settings.destroyBuildings = e.target.checked;
});

document.getElementById('helpingModeToggle').addEventListener('change', (e) => {
    settings.helpingMode = e.target.checked;
    if (!settings.helpingMode) {
        settings.trajectoryProgress = 0; // Reset animation
    }
    draw(); // Redraw immediately
});

document.getElementById('musicToggle').addEventListener('change', async (e) => {
    settings.musicEnabled = e.target.checked;

    if (!settings.musicEnabled) {
        settings.musicStatus = 'idle';
        if (audioEngine) {
            audioEngine.stopLoop();
        }
        showMessage(t('musicDisabled'));
        updateMusicStatusLabel();
        return;
    }

    const ready = await ensureAudioReady();
    if (!ready) {
        settings.musicEnabled = false;
        document.getElementById('musicToggle').checked = false;
        return;
    }

    if (audioEngine && audioEngine.hasLoop()) {
        audioEngine.playLoop();
        settings.musicStatus = 'ready';
    } else {
        await generateAndPlayMusic();
        return;
    }
    updateMusicStatusLabel();
});

document.getElementById('musicProfileSelect').addEventListener('change', (e) => {
    settings.selectedSoundProfile = e.target.value;
});

document.getElementById('generateMusicBtn').addEventListener('click', async () => {
    await generateAndPlayMusic();
});

// Credits modal
document.getElementById('creditsBtn').addEventListener('click', () => {
    document.getElementById('creditsModal').classList.add('show');
    // Draw bananas on the canvases
    drawCreditsBanana('banana1');
    drawCreditsBanana('banana2');
    drawCreditsBanana('banana3');
    drawCreditsBanana('banana4');
});

document.getElementById('closeCreditsBtn').addEventListener('click', () => {
    document.getElementById('creditsModal').classList.remove('show');
});

// Keys modal
document.getElementById('keysBtn').addEventListener('click', () => {
    document.getElementById('keysModal').classList.add('show');
});

document.getElementById('closeKeysBtn').addEventListener('click', () => {
    document.getElementById('keysModal').classList.remove('show');
});

// Close modals when clicking outside
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if (e.target.id === 'settingsModal') {
        document.getElementById('settingsModal').classList.remove('show');
    }
});

document.getElementById('creditsModal').addEventListener('click', (e) => {
    if (e.target.id === 'creditsModal') {
        document.getElementById('creditsModal').classList.remove('show');
    }
});

document.getElementById('keysModal').addEventListener('click', (e) => {
    if (e.target.id === 'keysModal') {
        document.getElementById('keysModal').classList.remove('show');
    }
});

// Function to draw banana on credits canvases
function drawCreditsBanana(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(15, 15);
    ctx.scale(0.6, 0.6);

    // Draw the curved banana shape
    ctx.fillStyle = '#FFE135';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-12, -8, -4, -12, 6, -10);
    ctx.bezierCurveTo(12, -8, 16, -2, 14, 6);
    ctx.bezierCurveTo(12, 10, 4, 12, -2, 10);
    ctx.bezierCurveTo(-8, 8, -10, 4, 0, 0);
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlights
    ctx.fillStyle = '#FFF5B0';
    ctx.beginPath();
    ctx.ellipse(3, -4, 3, 1.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Brown spots
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(-2, 2, 1.5, 1, 0.3, 0, Math.PI * 2);
    ctx.ellipse(5, 0, 1, 1.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(8, 4, 1.2, 0.8, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Stem
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(-3, -4);
    ctx.stroke();

    ctx.restore();
}

// ============================================================================
//  Serverless peer-to-peer multiplayer (WebRTC, manual copy/paste signalling)
//  Pattern mirrors game-tank-toys / game-tschau-sepp: no backend, an offer code
//  and an answer code are exchanged by hand. Sync is thrower-authoritative.
// ============================================================================

/* ---- connect-code codec: JSON -> deflate-raw -> base64url ---- */
function _b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function _unb64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
}
async function encodeCode(obj) {
    const json = JSON.stringify(obj);
    try {
        const cs = new CompressionStream('deflate-raw');
        const buf = await new Response(new Blob([json]).stream().pipeThrough(cs)).arrayBuffer();
        return 'G1.' + _b64(new Uint8Array(buf));
    } catch (e) {
        return 'G0.' + _b64(new TextEncoder().encode(json));
    }
}
async function decodeCode(str) {
    str = (str || '').trim().replace(/\s+/g, '');
    const i = str.indexOf('.');
    if (i < 0) throw new Error('bad code');
    const tag = str.slice(0, i), bytes = _unb64(str.slice(i + 1));
    let text;
    if (tag === 'G1') {
        const ds = new DecompressionStream('deflate-raw');
        const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
        text = new TextDecoder().decode(buf);
    } else {
        text = new TextDecoder().decode(bytes);
    }
    return JSON.parse(text);
}

/* ---- WebRTC manual-signalling link ---- */
class NetLink {
    constructor(onMsg, onState) {
        this.onMsg = onMsg; this.onState = onState; this.ch = null;
        this.pc = new RTCPeerConnection({
            iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
        });
        this.pc.onconnectionstatechange = () => this.onState(this.pc.connectionState);
    }
    _wire(ch) {
        this.ch = ch;
        ch.onopen = () => this.onState('open');
        ch.onclose = () => this.onState('closed');
        ch.onmessage = (e) => { try { this.onMsg(JSON.parse(e.data)); } catch (_) {} };
    }
    _gather() {
        return new Promise((res) => {
            if (this.pc.iceGatheringState === 'complete') return res();
            const t = setTimeout(res, 4000);
            this.pc.addEventListener('icegatheringstatechange', () => {
                if (this.pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
            });
        });
    }
    async host() {
        this._wire(this.pc.createDataChannel('game'));
        await this.pc.setLocalDescription(await this.pc.createOffer());
        await this._gather();
        return encodeCode(this.pc.localDescription);
    }
    async acceptAnswer(code) {
        await this.pc.setRemoteDescription(await decodeCode(code));
    }
    async join(code) {
        this.pc.ondatachannel = (e) => this._wire(e.channel);
        await this.pc.setRemoteDescription(await decodeCode(code));
        await this.pc.setLocalDescription(await this.pc.createAnswer());
        await this._gather();
        return encodeCode(this.pc.localDescription);
    }
    send(o) { if (this.ch && this.ch.readyState === 'open') this.ch.send(JSON.stringify(o)); }
    close() { try { this.pc.close(); } catch (_) {} }
}

function netSend(o) { if (net.link) net.link.send(o); }

/* ---- UI helpers ---- */
function mpEl(id) { return document.getElementById(id); }
function openMultiplayerModal() {
    mpShowPanel('choose');
    mpEl('multiplayerModal').classList.add('show');
}
function closeMultiplayerModal() { mpEl('multiplayerModal').classList.remove('show'); }
function mpShowPanel(name) {
    ['choose', 'host', 'join', 'connected'].forEach(p => {
        const el = mpEl('mp-panel-' + p);
        if (el) el.classList.toggle('mp-hidden', p !== name);
    });
}
function mpCopy(text, btn) {
    if (!text) return;
    const restore = () => { const o = btn.dataset.label || btn.textContent; btn.dataset.label = o; btn.textContent = t('mpCopied'); setTimeout(() => { btn.textContent = o; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(restore, restore);
    else restore();
}
function updateNetStatus() {
    const el = mpEl('netStatus');
    if (!el) return;
    if (!isNet()) { el.textContent = ''; el.classList.remove('show'); return; }
    const who = t('netYouAre', { player: net.myPlayer });
    const turn = isMyTurn() ? t('netYourTurn') : t('netOpponentTurn');
    el.textContent = who + ' — ' + turn;
    el.classList.add('show');
}

/* ---- connection flows ---- */
function newLink() {
    if (net.link) net.link.close();
    net.link = new NetLink((m) => netOnMessage(m), (s) => netOnState(s));
}
async function hostFlow() {
    mpShowPanel('host');
    net.active = false; net.connected = false; net.myPlayer = 1;
    const codeEl = mpEl('mp-host-code'), st = mpEl('mp-host-status');
    codeEl.value = ''; st.textContent = t('mpCreating'); st.className = 'mp-status';
    newLink();
    try {
        codeEl.value = await net.link.host();
        st.textContent = t('mpWaiting');
    } catch (e) {
        st.textContent = t('mpCodeError'); st.className = 'mp-status err';
    }
}
async function hostAccept() {
    const st = mpEl('mp-host-status');
    try {
        st.className = 'mp-status'; st.textContent = t('mpConnecting');
        await net.link.acceptAnswer(mpEl('mp-host-answer').value);
    } catch (e) { st.className = 'mp-status err'; st.textContent = t('mpBadCode'); }
}
async function joinFlow() {
    const st = mpEl('mp-join-status');
    net.active = false; net.connected = false; net.myPlayer = 2;
    newLink();
    try {
        st.className = 'mp-status'; st.textContent = t('mpCreating');
        mpEl('mp-join-answer').value = await net.link.join(mpEl('mp-join-code').value);
        st.textContent = t('mpSendReply');
    } catch (e) { st.className = 'mp-status err'; st.textContent = t('mpBadCode'); }
}

function startNetGame(seed, scores) {
    net.active = true;
    net.pendingOutcome = null; net.awaitingOutcome = false; net.iThrew = false;
    game.timeOfDay = 'day';
    game.scores = scores.slice();
    initGame(seed);           // sets currentPlayer = 1 (host throws first)
    game.animating = false;
    updateScores();
    updateGameInfo();
    updateThrowButtonState();
    mpShowPanel('connected');
    closeMultiplayerModal();
    showMessage(t('mpConnected'));
}

function netOnState(s) {
    if (s === 'open') {
        net.connected = true;
        if (net.myPlayer === 1) {
            // Host is authoritative for the initial board.
            const seed = (Math.random() * 1e9) | 0;
            netSend({ ty: 'newgame', seed, scores: [0, 0], destroy: !!settings.destroyBuildings });
            startNetGame(seed, [0, 0]);
        } else {
            const st = mpEl('mp-join-status');
            if (st) { st.className = 'mp-status ok'; st.textContent = t('mpConnected'); }
        }
    } else if (s === 'failed' || s === 'disconnected' || s === 'closed') {
        if (net.active || net.connected) handleNetDisconnect(true);
    }
}

function netOnMessage(m) {
    switch (m.ty) {
        case 'newgame':
            settings.destroyBuildings = !!m.destroy;
            { const tg = mpEl('destroyBuildingToggle'); if (tg) tg.checked = settings.destroyBuildings; }
            startNetGame(m.seed, m.scores || [0, 0]);
            break;
        case 'throw':
            onRemoteThrow(m);
            break;
        case 'outcome':
            net.pendingOutcome = m;
            tryApplyOutcome();
            break;
        case 'bye':
            handleNetDisconnect(true);
            break;
    }
}

/* ---- remote throw replay (cosmetic) ---- */
function onRemoteThrow(m) {
    if (!isNet()) return;
    game.timeOfDay = m.tod || game.timeOfDay;
    const gorilla = game.gorillas[game.currentPlayer - 1];
    if (!gorilla) return;
    const data = gorilla.throwBanana(m.angle, m.velocity, game.currentPlayer);
    game.banana = new Banana(data.x, data.y, data.vx, data.vy, game.currentPlayer);
    game.banana.cosmetic = true;
    game.animating = true;
    net.awaitingOutcome = false;
    updateThrowButtonState();
    showMessage(t('bananaInFlight'));
    animateRemote();
}
function animateRemote() {
    if (!game.banana || !game.banana.cosmetic) return;
    const r = game.banana.update();
    draw();
    if (r === 'flying') {
        requestAnimationFrame(animateRemote);
    } else {
        game.banana = null;
        draw();
        net.awaitingOutcome = true;   // local flight done; wait for authoritative outcome
        tryApplyOutcome();
    }
}
function tryApplyOutcome() {
    if (net.pendingOutcome && net.awaitingOutcome) {
        const m = net.pendingOutcome;
        net.pendingOutcome = null; net.awaitingOutcome = false;
        applyRemoteOutcome(m);
    }
}
function playExplosion(x, y, onDone) {
    const explosion = new Explosion(x, y);
    (function step() {
        draw();
        explosion.update();
        explosion.draw();
        if (!explosion.isDone()) requestAnimationFrame(step);
        else if (onDone) onDone();
    })();
}
function applyRemoteOutcome(m) {
    game.banana = null;
    game.animating = true;
    if (m.kind === 'gorilla') {
        const loser = game.gorillas[m.loser - 1];
        if (loser) loser.destroyed = true;
        playExplosion(m.ix, m.iy, () => {
            game.scores = m.scores.slice();
            updateScores();
            showMessage(t('winsRound', { player: m.winner }));
            setTimeout(() => {
                initGame(m.seed);
                game.scores = m.scores.slice();
                updateScores();
                game.animating = false;
                updateGameInfo();
                updateThrowButtonState();
            }, 2000);
        });
    } else if (m.kind === 'building') {
        if (m.damaged && game.buildings[m.bIdx]) game.buildings[m.bIdx].addDamage(m.ix, m.iy);
        playExplosion(m.ix, m.iy, () => {
            showMessage(t('hitBuilding'));
            game.currentPlayer = m.currentPlayer;
            setTimeout(() => {
                game.animating = false;
                updateGameInfo();
                updateThrowButtonState();
            }, 500);
        });
    } else { // miss
        showMessage(t('missed'));
        game.currentPlayer = m.currentPlayer;
        setTimeout(() => {
            game.animating = false;
            updateGameInfo();
            updateThrowButtonState();
        }, 1000);
    }
}

function handleNetDisconnect(notify) {
    const wasActive = net.active || net.connected;
    net.active = false; net.connected = false;
    net.pendingOutcome = null; net.awaitingOutcome = false; net.iThrew = false;
    if (net.link) { try { net.link.close(); } catch (e) {} net.link = null; }
    game.animating = false;
    if (game.banana && game.banana.cosmetic) game.banana = null;
    updateNetStatus();
    updateThrowButtonState();
    if (notify && wasActive) showMessage(t('netDisconnected'));
    draw();
}

/* ---- multiplayer UI wiring ---- */
(function wireMultiplayerUI() {
    const on = (id, ev, fn) => { const el = mpEl(id); if (el) el.addEventListener(ev, fn); };
    on('multiplayerBtn', 'click', openMultiplayerModal);
    on('mp-choose-host', 'click', hostFlow);
    on('mp-choose-join', 'click', () => { mpShowPanel('join'); mpEl('mp-join-code').value = ''; mpEl('mp-join-answer').value = ''; mpEl('mp-join-status').textContent = ''; });
    on('mp-back-host', 'click', () => mpShowPanel('choose'));
    on('mp-back-join', 'click', () => mpShowPanel('choose'));
    on('mp-copy-host', 'click', (e) => mpCopy(mpEl('mp-host-code').value, e.currentTarget));
    on('mp-copy-join', 'click', (e) => mpCopy(mpEl('mp-join-answer').value, e.currentTarget));
    on('mp-host-connect', 'click', hostAccept);
    on('mp-join-reply', 'click', joinFlow);
    on('mp-disconnect', 'click', () => { netSend({ ty: 'bye' }); handleNetDisconnect(false); showMessage(t('netDisconnected')); });
    on('closeMultiplayerBtn', 'click', closeMultiplayerModal);
    on('multiplayerModal', 'click', (e) => { if (e.target.id === 'multiplayerModal') closeMultiplayerModal(); });
})();

window.addEventListener('pagehide', () => { if (net.link) netSend({ ty: 'bye' }); });

// Initialize game on load
initGame();
updateBackground(); // Start background animation loop
updateUILanguage(); // Set initial language
updateMusicStatusLabel();

function disposeAudioSession() {
    if (audioEngine && typeof audioEngine.dispose === 'function') {
        audioEngine.dispose();
    }
}

window.addEventListener('pagehide', disposeAudioSession);
window.addEventListener('beforeunload', disposeAudioSession);

window.runMusicModelBenchmark = async function runMusicModelBenchmark() {
    if (!audioEngine) {
        console.warn('AudioEngine unavailable.');
        return null;
    }
    await ensureAudioReady();
    const benchmark = await audioEngine.runBenchmark();
    console.table(benchmark.results.map(result => ({
        model: result.id,
        pass: Boolean(result.passes),
        loadMs: result.loadMs || null,
        generateMs: result.generateMs || null,
        memoryMb: result.memoryMb || null,
        coherence: result.coherence || null,
        error: result.error || ''
    })));
    return benchmark;
};
