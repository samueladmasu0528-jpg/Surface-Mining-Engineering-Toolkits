# Surface Mining Engineering Toolkit

A React + Vite + Tailwind + Recharts single-page app with calculators for
stripping ratio, pit sensitivity, fleet sizing, CapEx/OpEx, slope stability,
grade blending, a 3D block model visualizer, and a report generator.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

## Deploy to GitHub Pages

### 1. Create the repo and push this code

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 2. Set the base path

Open `vite.config.js` and set `base` to match your repo name:

```js
base: '/YOUR_REPO_NAME/'
```

(If this repo IS your GitHub Pages user site, i.e. named
`YOUR_USERNAME.github.io`, set `base: '/'` instead.)

Commit and push that change.

### 3. Turn on GitHub Pages

In your repo on GitHub: **Settings → Pages → Build and deployment → Source →
GitHub Actions**.

That's it — the included workflow at `.github/workflows/deploy.yml` will
build the app and deploy it automatically on every push to `main`. Check the
**Actions** tab for progress; once it's green, your site is live at:

```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

### Alternative: deploy with the `gh-pages` package instead of Actions

```bash
npm install --save-dev gh-pages
```

Add to `package.json` scripts:

```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

Then run:

```bash
npm run deploy
```

And set Pages source to the `gh-pages` branch instead of GitHub Actions.
