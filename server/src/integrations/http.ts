import { HttpError } from './errors';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

type JsonFetchArgs = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string | undefined>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: JsonValue;
  timeoutMs?: number;
};

function withQuery(url: string, query?: JsonFetchArgs['query']) {
  if (!query) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export async function jsonFetch<T>(args: JsonFetchArgs): Promise<{ data: T; response: Response }> {
  const url = withQuery(args.url, args.query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs ?? 20_000);

  try {
    const res = await fetch(url, {
      method: args.method ?? 'GET',
      headers: {
        ...(args.body ? { 'content-type': 'application/json' } : {}),
        ...Object.fromEntries(Object.entries(args.headers ?? {}).filter(([, v]) => v !== undefined)) as Record<
          string,
          string
        >,
      },
      body: args.body ? JSON.stringify(args.body) : undefined,
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

    if (!res.ok) {
      throw new HttpError({
        message: `HTTP ${res.status} for ${url}`,
        status: res.status,
        url,
        details: payload,
      });
    }

    return { data: payload as T, response: res };
  } finally {
    clearTimeout(timeout);
  }
}

