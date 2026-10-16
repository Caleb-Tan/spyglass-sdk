import { errorFromResponse, SpyglassError } from "./error.js";

const DEFAULT_BASE_URL = "https://api.spyglass.so/v2";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRY_WAIT_MS = 30_000;

export type RequestOptions = {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  fetch: typeof fetch;
};

export function resolveOptions(options: {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
}): RequestOptions {
  const apiKey = options.apiKey ?? process.env.SPYGLASS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Pass apiKey or set SPYGLASS_API_KEY.",
    );
  }
  return {
    apiKey,
    baseUrl: (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? 1,
    fetch: options.fetch ?? globalThis.fetch,
  };
}

export async function request<T>(
  options: RequestOptions,
  method: "GET" | "POST",
  path: string,
  payload?: { query?: Record<string, unknown>; body?: unknown },
): Promise<T> {
  const url = new URL(`${options.baseUrl}${path}`);
  if (payload?.query) {
    for (const [key, value] of Object.entries(payload.query)) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout);
    let response: Response;
    try {
      response = await options.fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          Accept: "application/json",
          ...(payload?.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          payload?.body !== undefined ? JSON.stringify(payload.body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new SpyglassError({
          status: 0,
          code: "internal_error",
          message: `Request timed out after ${options.timeout}ms.`,
        });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = undefined;
    }
    const error = errorFromResponse(
      response.status,
      parsed,
      response.headers.get("retry-after"),
    );
    if (
      response.status === 429 &&
      attempt < options.maxRetries
    ) {
      attempt += 1;
      const wait = Math.min(
        (error.retryAfter ?? 1) * 1000,
        MAX_RETRY_WAIT_MS,
      );
      await delay(wait);
      continue;
    }
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function* pages<T>(
  load: (offset: number) => Promise<T>,
  items: (page: T) => unknown[],
  limit: number,
  startOffset = 0,
): AsyncGenerator<T> {
  let offset = startOffset;
  while (offset <= 9999) {
    const page = await load(offset);
    yield page;
    const rows = items(page);
    if (rows.length < limit) return;
    const next = offset + limit;
    if (next > 9999) return;
    offset = next;
  }
}
