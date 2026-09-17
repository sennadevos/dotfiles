// Hand-rolled build for the dsh client bundle (dsh's tsdown client preset is
// unpublished, see SPEC item 24).
//
// Produces lib/client.js in the verified lazy-CJS envelope shape of every
// shipped bundle (mirrors dsh-client-hmr/lib/client.js):
//
//   window.__ModuleLoader__.load({
//     id: "<package name>",
//     factory: (require) => {
//       ...esbuild CJS output (react / primitives stay bare require() calls)...
//       return module.exports;
//     }
//   });
//
// The banner declares `module`/`exports` exactly as esbuild's CJS output
// expects them; the footer hands the exports object back to the loader.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const outfile = new URL('../lib/client.js', import.meta.url).pathname

await mkdir(new URL('../lib', import.meta.url).pathname, { recursive: true })

const result = await build({
  entryPoints: ['src/client.jsx'],
  bundle: true,
  format: 'cjs',
  jsx: 'automatic',
  target: 'es2022',
  platform: 'browser',
  charset: 'utf8',
  legalComments: 'none',
  minify: false,
  sourcemap: false,
  outfile,
  logLevel: 'info',
  // Shell seed words only — they resolve from the runtime require at
  // materialization and must stay external (DESIGN.md §2/§5.1).
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-primitives',
  ],
  banner: {
    js: `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
`,
  },
  footer: {
    js: `
\t\treturn module.exports;
\t}
});
`,
  },
})

if (result.errors.length > 0) {
  console.error('build failed')
  process.exit(1)
}

// Substitute the package-id placeholder in the emitted string literal.
let src = readFileSync(outfile, 'utf8').replace(/(['"])__PACKAGE_ID__\1/g, (_, quote) => `${quote}${pkg.name}${quote}`)
const problems = []
if (!src.startsWith('window.__ModuleLoader__.load({')) problems.push('bundle does not open with the ModuleLoader envelope')
if (!/\}\s*\}\);\s*$/.test(src)) problems.push('bundle does not close with the factory + load envelope')
if (!/require\("react\/jsx-runtime"\)|require\("react"\)/.test(src)) problems.push('bare react require missing (externals drifted)')
if (/from\s+["']react["']/.test(src)) problems.push('ESM react import leaked into the bundle')
if (src.includes('__PACKAGE_ID__')) problems.push('PACKAGE_ID placeholder not substituted')
if (problems.length > 0) {
  for (const problem of problems) console.error(`POSTCONDITION FAIL: ${problem}`)
  process.exit(1)
}
await writeFile(outfile, src)
console.log(`built ${outfile} (${src.length} bytes)`)
