import { supabase } from '@/integrations/supabase/client';

// Os arquivos (fotos, documentos, comprovantes) ficam em buckets privados.
// No banco guardamos a URL pública antiga (…/object/public/<bucket>/<caminho>) e,
// na hora de exibir, trocamos por um link assinado que expira.

const URL_PATTERN = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/;

const EXPIRES_IN_SECONDS = 4 * 60 * 60;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const cache = new Map<string, { url: string; expiresAt: number }>();

export function parseStorageUrl(url?: string | null): { bucket: string; path: string } | null {
  if (!url) return null;
  const match = url.match(URL_PATTERN);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

function fromCache(bucket: string, path: string): string | null {
  const hit = cache.get(`${bucket}/${path}`);
  return hit && hit.expiresAt - Date.now() > REFRESH_MARGIN_MS ? hit.url : null;
}

function toCache(bucket: string, path: string, signedUrl: string) {
  cache.set(`${bucket}/${path}`, { url: signedUrl, expiresAt: Date.now() + EXPIRES_IN_SECONDS * 1000 });
}

// Assina várias URLs de uma vez (uma chamada por bucket). URLs que não são do
// storage, ou que falharem, voltam sem alteração.
export async function signStorageUrls(urls: Array<string | null | undefined>): Promise<string[]> {
  const result = urls.map((u) => u ?? '');
  const pending = new Map<string, { path: string; indexes: number[] }[]>();

  urls.forEach((url, index) => {
    const target = parseStorageUrl(url);
    if (!target) return;
    const cached = fromCache(target.bucket, target.path);
    if (cached) {
      result[index] = cached;
      return;
    }
    const list = pending.get(target.bucket) ?? [];
    const existing = list.find((item) => item.path === target.path);
    if (existing) existing.indexes.push(index);
    else list.push({ path: target.path, indexes: [index] });
    pending.set(target.bucket, list);
  });

  await Promise.all(
    [...pending.entries()].map(async ([bucket, items]) => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(items.map((item) => item.path), EXPIRES_IN_SECONDS);
      if (error || !data) {
        console.error('Erro ao assinar URLs do storage:', error);
        return;
      }
      data.forEach((entry, i) => {
        if (!entry.signedUrl) return;
        toCache(bucket, items[i].path, entry.signedUrl);
        items[i].indexes.forEach((index) => { result[index] = entry.signedUrl; });
      });
    }),
  );

  return result;
}

export async function signStorageUrl(url?: string | null): Promise<string> {
  const [signed] = await signStorageUrls([url]);
  return signed;
}
