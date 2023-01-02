import type { AstroAdapter, AstroConfig, AstroIntegration } from 'astro';
import type { Args } from './netlify-builders.js';
import { createRedirects } from './shared.js';

export function getAdapter(args: Args = {}): AstroAdapter {
	return {
		name: '@e-xisto/astro-netlify/builders',
		serverEntrypoint: '@e-xisto/astro-netlify/netlify-builders.js',
		exports: ['handler'],
		args,
	};
}

interface NetlifyFunctionsOptions {
	dist?: URL;
	binaryMediaTypes?: string[];
}

function netlifyFunctions({
	dist,
	binaryMediaTypes,
}: NetlifyFunctionsOptions = {}): AstroIntegration {
	let _config: AstroConfig;
	let entryFile: string;
	let needsBuildConfig = false;
	return {
		name: '@e-xisto/astro-netlify',
		hooks: {
			'astro:config:setup': ({ config, updateConfig }) => {
				needsBuildConfig = !config.build.client;
				const outDir = dist ?? new URL('./dist/', config.root);
				updateConfig({
					outDir,
					build: {
						client: outDir,
						server: new URL('./functions/', config.root),
					},
				});
			},
			'astro:config:done': ({ config, setAdapter }) => {
				setAdapter(getAdapter({ binaryMediaTypes }));
				_config = config;
				entryFile = config.build.serverEntry.replace(/\.m?js/, '');

				if (config.output === 'static') {
					console.warn(`[@e-xisto/astro-netlify] \`output: "server"\` is required to use this adapter.`);
					console.warn(
						`[@e-xisto/astro-netlify] Otherwise, this adapter is not required to deploy a static site to Netlify.`
					);
				}
			},
			'astro:build:start': ({ buildConfig }) => {
				if (needsBuildConfig) {
					buildConfig.client = _config.outDir;
					buildConfig.server = new URL('./functions/', _config.root);
					entryFile = buildConfig.serverEntry.replace(/\.m?js/, '');
				}
			},
			'astro:build:done': async ({ routes, dir }) => {
				await createRedirects(routes, dir, entryFile, 'builders');
			},
		},
	};
}

export { netlifyFunctions, netlifyFunctions as default };
