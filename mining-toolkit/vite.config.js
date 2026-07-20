import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT for GitHub Pages (project sites, i.e. username.github.io/REPO_NAME):
// base must match your repo name, e.g. '/surface-mining-toolkit/'.
// If you're deploying to a USER/ORG page (username.github.io repo itself),
// leave base as '/'.
export default defineConfig({
  plugins: [react()],
  base: '/surface-mining-toolkit/'
});
