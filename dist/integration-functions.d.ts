import type { AstroAdapter, AstroIntegration } from 'astro';
import type { Args } from './netlify-functions.js';
export declare function getAdapter(args?: Args): AstroAdapter;
interface NetlifyFunctionsOptions {
    dist?: URL;
    binaryMediaTypes?: string[];
}
declare function netlifyFunctions({ dist, binaryMediaTypes, }?: NetlifyFunctionsOptions): AstroIntegration;
export { netlifyFunctions, netlifyFunctions as default };
