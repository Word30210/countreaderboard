import fs from 'node:fs'
import path from 'node:path'

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

// GitHub Pages SPA fallback: copy dist/index.html -> dist/404.html so that
// deep links (e.g. /country/USA) get the same SPA bootstrap on direct access.
const spaFallback = () => ({
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
        const indexPath = path.resolve('dist/index.html')
        const fallbackPath = path.resolve('dist/404.html')

        if (fs.existsSync(indexPath)) {
            fs.copyFileSync(indexPath, fallbackPath)
        }
    },
})

export default defineConfig({
    base: '/countreaderboard/',
    plugins: [solid(), spaFallback()],
})
