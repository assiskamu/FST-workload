# FST UMS Workload Calculator (Static)

This repo hosts the Canva-exported workload calculator as a static site that runs on GitHub Pages.

## Deploy on GitHub Pages

1. Commit the files in this repository and push to GitHub.
2. In **Settings → Pages**, select the `main` branch (or your default branch) and the `/root` folder.
3. Create a `.nojekyll` file at the repository root to disable Jekyll processing:
   ```bash
   touch .nojekyll
   ```
4. Visit the site at:
   `https://assiskamu.github.io/FST-workload/`

## Run locally

Open `index.html` directly (double-click or `file://`) to use the app without a build step.

## Data persistence

All data is stored in `localStorage` under the key `fst_workload_v1`.
