import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const dest = resolve(root, 'dist')
const web = resolve(dest, 'web')
const assets = resolve(web, 'js/review-huddle')
const html = await readFile(resolve(root, 'index.html'), 'utf8')
const license = await readFile(resolve(root, 'LICENSE'), 'utf8')
const notice = `/* Review Huddle, from https://github.com/chaseakub/complaint-spotter\n${license.trim()}\n*/\n`
const publicPath = '/js/review-huddle/'
const modules = ['rules.js', 'analyze.js', 'csv.js', 'huddle.js', 'huddle-editor.js', 'huddle-page.js', 'huddle-editor.css']
await mkdir(assets, {recursive: true})
await mkdir(resolve(web, 'tools'), {recursive: true})
for (const name of modules) {
  const source = await readFile(resolve(root, 'src', name), 'utf8')
  await writeFile(resolve(assets, name), notice + source)
}
const hosted = html.replaceAll('./src/', publicPath)
  .replace('href="./downloads/review-huddle.html"', 'href="/downloads/review-huddle.standalone"')
  .replace('<body class="rh-page">', '<body class="rh-page" data-asset="tools-review-huddle">')
  .replace('</head>', '<script src="/js/consent.js" defer></script>\n  <script type="module" src="/js/page-analytics.js"></script>\n</head>')
  .replace('<footer class="rh-footer">', '<footer class="rh-footer">\n      <a class="rh-text" href="/contact">Contact Replio</a>')
  .replace('<title>', '<link rel="canonical" href="https://www.repliohq.com/tools/review-huddle">\n  <title>')
await writeFile(resolve(web, 'tools/review-huddle.html'), hosted)

// The standalone file can be opened from disk with no server or installation.
const result = await build({absWorkingDir: root, entryPoints: ['src/huddle-page.js'], bundle: true, write: false,
  format: 'iife', target: 'es2020', legalComments: 'inline', charset: 'utf8'})
const css = await readFile(resolve(root, 'src/huddle-editor.css'), 'utf8')
const offline = html
  .replace('<link rel="stylesheet" href="./src/huddle-editor.css">', () => `<style>\n${css}\n</style>`)
  .replace('  <script type="module" src="./src/huddle-page.js"></script>\n', '')
  .replace('</body>', () => `<script>\n${notice}${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}\n</script>\n</body>`)
await writeFile(resolve(dest, 'review-huddle.html'), offline)
await mkdir(resolve(root, 'downloads'), {recursive: true})
await writeFile(resolve(root, 'downloads/review-huddle.html'), offline)
await mkdir(resolve(web, 'downloads'), {recursive: true})
await writeFile(resolve(web, 'downloads/review-huddle.standalone'), offline)
console.log('Built dist/review-huddle.html and the hosted files in dist/web/')
