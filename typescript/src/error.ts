import type { ApiErrorBody, ApiErrorCode } from "./types.js";

export class SpyglassError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | string;
  readonly details?: { path: string; message: string }[];
  readonly retryAfter?: number;

  constructor(options: {
    status: number;
    code: ApiErrorCode | string;
    message: string;
    details?: { path: string; message: string }[];
    retryAfter?: number;
  }) {
    super(options.message);
    this.name = "SpyglassError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.retryAfter = options.retryAfter;
  }
}

export function errorFromResponse(
  status: number,
  body: unknown,
  retryAfterHeader: string | null,
): SpyglassError {
  const parsed = isErrorBody(body) ? body.error : undefined;
  const retryAfter = parseRetryAfter(retryAfterHeader);
  return new SpyglassError({
    status,
    code: parsed?.code ?? "internal_error",
    message: parsed?.message ?? `Request failed with status ${status}.`,
    details: parsed?.details,
    retryAfter,
  });
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  if (!body || typeof body !== "object" || !("error" in body)) return false;
  const error = (body as { error: unknown }).error;
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds;
  const date = Date.parse(header);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}
