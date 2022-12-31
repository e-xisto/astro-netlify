import type { Handler } from '@netlify/functions';
import { SSRManifest } from 'astro';
export interface Args {
    binaryMediaTypes?: string[];
}
export declare const createExports: (manifest: SSRManifest, args: Args) => {
    handler: Handler;
};
