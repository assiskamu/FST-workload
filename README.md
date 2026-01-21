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

## Submission backend (Google Apps Script)

The submission feature posts a full report payload to a Google Apps Script Web App, which then appends summary rows and per-section items into Google Sheets.

### Deployment steps

1. **Create a Google Sheet** to store submissions (any empty spreadsheet works).
2. **Open Apps Script** from the sheet: **Extensions → Apps Script**.
3. **Create `Code.gs`** and paste the contents of `Code.gs` from this repository.
4. **Set Script Properties** (in Apps Script: **Project Settings → Script properties**):
   - `SPREADSHEET_ID`: the ID of your Google Sheet.
   - `SUBMIT_TOKEN`: a secret token that submitters must provide.
   - `ALLOWED_ORIGIN`: your GitHub Pages origin (e.g., `https://yourname.github.io`).
5. **Deploy as Web App**:
   - Click **Deploy → New deployment**.
   - Select **Web app**.
   - Execute as **Me**.
   - Who has access: **Anyone** (or **Anyone with the link**).
   - Copy the **Web App URL**.
6. **Update the frontend**:
   - In `app.js`, set `SUBMIT_ENDPOINT` to the Web App URL.
   - Users will be prompted for the token at submission time (not stored in code).

### Sheets created

The script auto-creates sheets if missing:

- `submissions` (summary rows)
- `teaching_items`, `supervision_items`, `research_items`, `publications_items`
- `admin_leadership_items`, `admin_duties_items`, `service_items`, `lab_items`, `professional_items`
