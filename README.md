# game-gorillazz

A browser-based clone of the classic QBasic Gorillas game. Two gorillas stand on top of buildings and throw bananas at each other!

## Play Online

**▶️ Play it: https://github.freaxnx01.ch/game-gorillazz/**

## Features

- Classic Gorillas gameplay
- Multi-language support (German, English, Hungarian)
- Day/night cycle
- Building destruction mode
- Trajectory helper line
- Keyboard shortcuts for various game features
- AI-generated in-game music (browser runtime)

## AI Music Documentation

- Runtime architecture and lifecycle: `docs/AI_MUSIC_RUNTIME.md`

## Development

This is a static HTML/CSS/JavaScript game with no build process required.

### Local Testing

Simply open `src/index.html` in your web browser or use a local server:

```bash
# Using Python
cd src
python -m http.server 8000

# Using Node.js
cd src
npx serve
```

Then visit `http://localhost:8000` in your browser.

## Deployment

The game automatically deploys to GitHub Pages on every push to the `main` or `master` branch.

### Automatic Deployment

Every push to the main branch triggers the deployment workflow which:
1. Checks out the repository
2. Configures GitHub Pages
3. Uploads the `src` directory as a static site
4. Deploys to GitHub Pages

### Manual Deployment

You can also trigger a deployment manually:
1. Go to the "Actions" tab in the GitHub repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow" 
4. Select the branch and click "Run workflow"

The deployment typically takes 1-2 minutes to complete.

## Credits

- freaxnx01
- Tschosi "forwardare" Ätti aka L.A. Brace

_This game is dedicated to Juliska_
