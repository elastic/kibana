/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tiny fetch wrapper shared by every adapter. Centralizes the things we
 * do not want each adapter to re-derive:
 *
 * - Default User-Agent that names Kibana so feed operators can opt-in
 *   to allowlist us (a few RSS feeds hard-block the default Node UA).
 * - Per-request timeout layered on top of the workflow step's own
 *   abort signal. The step signal cancels the whole step; the timeout
 *   fences a single fetch so a hung connection on one item does not
 *   eat the budget for the rest.
 * - Response size cap. RSS bodies should be <2MB; STIX bundles can be
 *   large but >10MB is almost always a configuration mistake. Enforced
 *   via incremental reads instead of trusting `Content-Length` (which
 *   can be missing on chunked responses).
 * - Body decode. Defaults to UTF-8 with a fall-through to
 *   `latin1` — XML feeds in the wild still ship with non-UTF-8
 *   declarations and we want to surface readable text rather than
 *   replacement characters everywhere.
 *
 * NOT done here: ETag / If-Modified-Since conditional GETs, retries,
 * proxying through the actions plugin's HTTP connector. Those are
 * follow-ups; the goal of this PR is parity with the previous YAML
 * `http` step (single GET, single response body) plus per-item
 * normalization.
 */

const DEFAULT_USER_AGENT = 'Kibana-ThreatIntelligence/1.0 (+https://www.elastic.co/security)';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export interface FetchUrlOptions {
  /** Step-level cancellation. Combined with the per-request timeout. */
  abortSignal: AbortSignal;
  /** Optional headers. Adapter sets `Accept` for STIX/TAXII negotiation. */
  headers?: Record<string, string>;
  /** Override default 30s. Used only by tests today. */
  timeoutMs?: number;
  /** Override default 10MiB cap. Used only by tests today. */
  maxBytes?: number;
  /** Override `globalThis.fetch`. Used only by tests today. */
  fetchFn?: typeof fetch;
}

export interface FetchUrlResult {
  status: number;
  statusText: string;
  body: string;
  /** Lower-cased response header names to single string values. */
  headers: Record<string, string>;
  /** Final URL after redirects, useful for adapters that want to reflect it on `source.url`. */
  finalUrl: string;
}

/**
 * Combined-signal helper. We can't pass both `abortSignal` and the
 * timeout abort to fetch (only one signal field), so we forward the
 * caller's signal to a fresh `AbortController` and add the timeout to
 * the same controller.
 */
const linkSignals = (
  outer: AbortSignal,
  timeoutMs: number
): { signal: AbortSignal; cancel: () => void } => {
  const controller = new AbortController();
  const onAbort = () => controller.abort(outer.reason);
  if (outer.aborted) {
    controller.abort(outer.reason);
  } else {
    outer.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => {
    controller.abort(new Error(`Timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      outer.removeEventListener('abort', onAbort);
    },
  };
};

/**
 * Read a Web ReadableStream into a single string with an enforced byte
 * cap. We can't trust `Content-Length` (chunked + gzip responses often
 * omit it) so the cap is enforced incrementally on the decoded chunks.
 */
const readBodyWithCap = async (response: Response, maxBytes: number): Promise<string> => {
  if (!response.body) {
    return response.text();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let received = 0;
  let result = '';
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) {
      received += chunk.value.byteLength;
      if (received > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // best-effort cancel; nothing actionable on close error
        }
        throw new Error(
          `Response body exceeded the ${maxBytes}-byte cap (saw at least ${received} bytes)`
        );
      }
      result += decoder.decode(chunk.value, { stream: true });
    }
  }
  result += decoder.decode();
  return result;
};

const headersToRecord = (headers: Headers): Record<string, string> => {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
};

export const fetchUrl = async (url: string, options: FetchUrlOptions): Promise<FetchUrlResult> => {
  const {
    abortSignal,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    fetchFn = globalThis.fetch,
  } = options;

  const { signal, cancel } = linkSignals(abortSignal, timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: 'application/json, application/xml, text/xml, application/atom+xml, */*',
        'Accept-Encoding': 'gzip, deflate',
        ...(headers ?? {}),
      },
      signal,
    });
    const body = await readBodyWithCap(response, maxBytes);
    return {
      status: response.status,
      statusText: response.statusText,
      body,
      headers: headersToRecord(response.headers),
      finalUrl: response.url || url,
    };
  } finally {
    cancel();
  }
};
