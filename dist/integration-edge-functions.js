import esbuild from 'esbuild';
import * as fs from 'fs';
import * as npath from 'path';
import { fileURLToPath } from 'url';
import { createRedirects } from './shared.js';
const SHIM = `globalThis.process = {
	argv: [],
	env: Deno.env.toObject(),
};`;
export function getAdapter() {
    return {
        name: '@e-xisto/astro-netlify/edge-functions',
        serverEntrypoint: '@e-xisto/astro-netlify/netlify-edge-functions.js',
        exports: ['default'],
    };
}
async function createEdgeManifest(routes, entryFile, dir) {
    const functions = [];
    for (const route of routes) {
        if (route.pathname) {
            functions.push({
                function: entryFile,
                path: route.pathname,
            });
        }
        else {
            functions.push({
                function: entryFile,
                // Make route pattern serializable to match expected
                // Netlify Edge validation format. Mirrors Netlify's own edge bundler:
                // https://github.com/netlify/edge-bundler/blob/main/src/manifest.ts#L34
                pattern: route.pattern.source.replace(/\\\//g, '/').toString(),
            });
        }
    }
    const manifest = {
        functions,
        version: 1,
    };
    const baseDir = new URL('./.netlify/edge-functions/', dir);
    await fs.promises.mkdir(baseDir, { recursive: true });
    const manifestURL = new URL('./manifest.json', baseDir);
    const _manifest = JSON.stringify(manifest, null, '  ');
    await fs.promises.writeFile(manifestURL, _manifest, 'utf-8');
}
async function bundleServerEntry({ serverEntry, server }, vite) {
    const entryUrl = new URL(serverEntry, server);
    const pth = fileURLToPath(entryUrl);
    await esbuild.build({
        target: 'es2020',
        platform: 'browser',
        entryPoints: [pth],
        outfile: pth,
        allowOverwrite: true,
        format: 'esm',
        bundle: true,
        external: ['@astrojs/markdown-remark'],
        banner: {
            js: SHIM,
        },
    });
    // Remove chunks, if they exist. Since we have bundled via esbuild these chunks are trash.
    try {
        const chunkFileNames = vite?.build?.rollupOptions?.output?.chunkFileNames ?? 'assets/chunks/chunk.[hash].mjs';
        const chunkPath = npath.dirname(chunkFileNames);
        const chunksDirUrl = new URL(chunkPath + '/', server);
        await fs.promises.rm(chunksDirUrl, { recursive: true, force: true });
    }
    catch { }
}
export function netlifyEdgeFunctions({ dist } = {}) {
    let _config;
    let entryFile;
    let _buildConfig;
    let _vite;
    return {
        name: '@e-xisto/astro-netlify/edge-functions',
        hooks: {
            'astro:config:setup': ({ config, updateConfig }) => {
                // Add a plugin that shims the global environment.
                const injectPlugin = {
                    name: '@astrojs/netlify/plugin-inject',
                    generateBundle(_options, bundle) {
                        if (_buildConfig.serverEntry in bundle) {
                            const chunk = bundle[_buildConfig.serverEntry];
                            if (chunk && chunk.type === 'chunk') {
                                chunk.code = `globalThis.process = { argv: [], env: {}, };${chunk.code}`;
                            }
                        }
                    },
                };
                const outDir = dist ?? new URL('./dist/', config.root);
                updateConfig({
                    outDir,
                    build: {
                        client: outDir,
                        server: new URL('./.netlify/edge-functions/', config.root),
                        serverEntry: 'entry.js',
                    },
                    vite: {
                        plugins: [injectPlugin],
                    },
                });
            },
            'astro:config:done': ({ config, setAdapter }) => {
                setAdapter(getAdapter());
                _config = config;
                _buildConfig = config.build;
                entryFile = config.build.serverEntry.replace(/\.m?js/, '');
                if (config.output === 'static') {
                    console.warn(`[@e-xisto/astro-netlify] \`output: "server"\` is required to use this adapter.`);
                    console.warn(`[@e-xisto/astro-netlify] Otherwise, this adapter is not required to deploy a static site to Netlify.`);
                }
            },
            'astro:build:setup': ({ vite, target }) => {
                if (target === 'server') {
                    _vite = vite;
                    vite.resolve = vite.resolve || {};
                    vite.resolve.alias = vite.resolve.alias || {};
                    const aliases = [{ find: 'react-dom/server', replacement: 'react-dom/server.browser' }];
                    if (Array.isArray(vite.resolve.alias)) {
                        vite.resolve.alias = [...vite.resolve.alias, ...aliases];
                    }
                    else {
                        for (const alias of aliases) {
                            vite.resolve.alias[alias.find] = alias.replacement;
                        }
                    }
                    vite.ssr = {
                        noExternal: true,
                    };
                }
            },
            'astro:build:done': async ({ routes, dir }) => {
                await bundleServerEntry(_buildConfig, _vite);
                await createEdgeManifest(routes, entryFile, _config.root);
                await createRedirects(routes, dir, entryFile, 'edge-functions');
            },
        },
    };
}
export { netlifyEdgeFunctions as default };
