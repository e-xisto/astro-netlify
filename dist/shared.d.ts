import type { RouteData } from 'astro';
export declare function createRedirects(routes: RouteData[], dir: URL, entryFile: string, type: 'functions' | 'edge-functions' | 'builders'): Promise<void>;
