import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const worker = `const spaFallback = '/index.html';

function canFallbackToSpa(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (response.status !== 404) return false;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/assets/')) return false;
  if (url.pathname.includes('.')) return false;

  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html') || accept === '' || accept.includes('*/*');
}

export default {
  async fetch(request, env) {
    if (!env?.ASSETS) {
      return new Response('Sites asset binding unavailable', { status: 500 });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' },
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (!canFallbackToSpa(request, assetResponse)) return assetResponse;

    const fallbackUrl = new URL(spaFallback, request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
`;

await rm(resolve('dist/data'), { recursive: true, force: true });

const serverDir = resolve('dist/server');
await mkdir(serverDir, { recursive: true });
await writeFile(resolve(serverDir, 'index.js'), worker);
