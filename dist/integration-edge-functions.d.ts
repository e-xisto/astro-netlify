import type { AstroAdapter, AstroIntegration } from 'astro';
export declare function getAdapter(): AstroAdapter;
interface NetlifyEdgeFunctionsOptions {
    dist?: URL;
}
export declare function netlifyEdgeFunctions({ dist }?: NetlifyEdgeFunctionsOptions): AstroIntegration;
export { netlifyEdgeFunctions as default };
