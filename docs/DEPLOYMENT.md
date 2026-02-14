# Deployment Guide

This document describes how the game is automatically deployed to GitHub Pages.

## Overview

The deployment is fully automated using GitHub Actions. Whenever code is pushed to the `main` or `master` branch, the workflow automatically deploys the latest version to GitHub Pages.

## Deployment URL

The game is available at: **https://freaxnx01.github.io/game-gorillazz/**

## Automatic Deployment

### Trigger Conditions

The deployment workflow runs automatically when:
- Code is pushed to the `main` branch
- Code is pushed to the `master` branch

### Deployment Process

1. **Checkout**: The workflow checks out the latest code from the repository
2. **Configure Pages**: Sets up GitHub Pages configuration
3. **Upload Artifact**: Uploads the contents of the `src` directory as a static site artifact
4. **Deploy**: Deploys the artifact to GitHub Pages

The entire process typically takes 1-2 minutes to complete.

## Manual Deployment

You can manually trigger a deployment at any time:

1. Navigate to the GitHub repository
2. Click on the "Actions" tab
3. Select "Deploy to GitHub Pages" from the workflows list
4. Click the "Run workflow" button
5. Select the branch you want to deploy (typically `main`)
6. Click "Run workflow" to start the deployment

## Repository Setup Requirements

For the deployment to work, the following must be configured in the repository settings:

1. **GitHub Pages**:
   - Go to Settings → Pages
   - Under "Build and deployment", select "GitHub Actions" as the source
   
2. **Permissions**:
   - The workflow has the necessary permissions configured in the YAML file
   - No additional permissions need to be granted

## Workflow File

The deployment workflow is defined in `.github/workflows/deploy.yml`

### Key Configuration

```yaml
on:
  push:
    branches:
      - main
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write
```

- `push`: Triggers on pushes to main/master branches
- `workflow_dispatch`: Allows manual triggering from GitHub UI
- `permissions`: Grants necessary permissions for deployment

## Deployment Content

The workflow deploys the `src` directory, which contains:
- `index.html` - Main game HTML file
- `gorillas.js` - Game JavaScript code
- `style.css` - Game styles

These files are served as a static website without any build process.

## Troubleshooting

### Deployment Failed

1. Check the Actions tab to view the workflow run logs
2. Common issues:
   - Missing files in the `src` directory
   - Invalid YAML syntax in the workflow file
   - GitHub Pages not enabled in repository settings

### Site Not Updating

1. Verify the workflow ran successfully in the Actions tab
2. Check that changes were committed and pushed to the correct branch
3. GitHub Pages may take a few minutes to update after deployment
4. Try a hard refresh in your browser (Ctrl+Shift+R or Cmd+Shift+R)

### Accessing Deployment Logs

1. Go to the Actions tab
2. Click on the most recent workflow run
3. Expand the deployment step to view detailed logs

## Testing Deployment Locally

Before pushing changes, you can test the game locally:

```bash
cd src
python -m http.server 8000
```

Then open http://localhost:8000 in your browser to verify the game works correctly.
