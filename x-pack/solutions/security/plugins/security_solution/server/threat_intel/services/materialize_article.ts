/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MaterializeArticleInput,
  MaterializeArticleOutput,
} from '../../../common/threat_intel/workflows/step_types/materialize_article/materialize_article_common';
import { assertSafeUrlResolved, type DnsLookupFn } from '../adapters/http_client';
import { normalizeProvenanceUrl } from './provenance_url';

const JINA_READER_URL = 'https://r.jina.ai';
const MAX_ARTICLE_CHARS = 500_000;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90_000;
const URL_VALIDATION_TIMEOUT_MS = 10_000;
const UNAUTHENTICATED_REQUEST_INTERVAL_MS = 3_500;
const MIN_RENDER_CHARS = 200;
const MAX_REASON_CHARS = 500;

const CHALLENGE_MARKERS = [
  'checking your browser',
  'enable javascript',
  'please wait while we verify',
  'access denied',
  'captcha',
] as const;
const CHALLENGE_HEAD_CHARS = 1_000;
const CHALLENGE_TINY_PAGE_CHARS = 1_200;

let nextUnauthenticatedRequestAt = 0;

const abortableDelay = async (waitMs: number, abortSignal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      abortSignal.removeEventListener('abort', onAbort);
      reject(new Error('Jina request pacing aborted'));
    };
    const onElapsed = () => {
      abortSignal.removeEventListener('abort', onAbort);
      resolve();
    };
    const timeout = setTimeout(onElapsed, waitMs);
    if (abortSignal.aborted) onAbort();
    else abortSignal.addEventListener('abort', onAbort, { once: true });
  });

const paceUnauthenticatedRequest = async (abortSignal: AbortSignal): Promise<void> => {
  const now = Date.now();
  const startAt = Math.max(now, nextUnauthenticatedRequestAt);
  nextUnauthenticatedRequestAt = startAt + UNAUTHENTICATED_REQUEST_INTERVAL_MS;
  const waitMs = startAt - now;
  if (waitMs > 0) {
    await abortableDelay(waitMs, abortSignal);
  }
};

const reason = (value: unknown): string =>
  (value instanceof Error ? value.message : String(value)).slice(0, MAX_REASON_CHARS);

/**
 * Transient failures worth another materialization pass. Permanent validation /
 * 4xx / private-URL / NXDOMAIN failures stay `fallback` so enrichment can
 * finish on RSS instead of crowding the oldest-first pending batch.
 *
 * Match error codes / known transport phrases only. A bare `network` substring
 * would also hit hostnames like `research.network.example` in validation errors.
 */
const isRetryableMaterializationError = (error: unknown): boolean => {
  const message = reason(error);
  if (/timed out/i.test(message)) return true;
  if (/aborted/i.test(message)) return true;
  const httpMatch = /Jina Reader returned HTTP (\d+)/i.exec(message);
  if (httpMatch) {
    const code = Number(httpMatch[1]);
    return code === 408 || code === 429 || code >= 500;
  }
  // EAI_AGAIN is a transient resolver failure. ENOTFOUND / NXDOMAIN is not.
  return /\bfetch failed\b|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH/i.test(
    message
  );
};

const sliceWithoutSplittingSurrogatePair = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  const lastIncluded = value.charCodeAt(maxChars - 1);
  const firstExcluded = value.charCodeAt(maxChars);
  const splitSurrogatePair =
    lastIncluded >= 0xd800 &&
    lastIncluded <= 0xdbff &&
    firstExcluded >= 0xdc00 &&
    firstExcluded <= 0xdfff;
  return value.slice(0, splitSurrogatePair ? maxChars - 1 : maxChars);
};

const validateArticleUrl = async (
  articleUrl: string,
  abortSignal: AbortSignal,
  lookupFn?: DnsLookupFn
): Promise<void> => {
  let onAbort: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      assertSafeUrlResolved(articleUrl, lookupFn).then(() => undefined),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(`Article URL validation timed out after ${URL_VALIDATION_TIMEOUT_MS}ms`)
            ),
          URL_VALIDATION_TIMEOUT_MS
        );
        onAbort = () => reject(new Error('Article URL validation aborted'));
        if (abortSignal.aborted) onAbort();
        else abortSignal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (onAbort) abortSignal.removeEventListener('abort', onAbort);
  }
};

const readResponseWithCap = async (response: Response): Promise<string> => {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error(`Jina response exceeded the ${MAX_RESPONSE_BYTES}-byte cap`);
  }
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
      throw new Error(`Jina response exceeded the ${MAX_RESPONSE_BYTES}-byte cap`);
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error(`Jina response exceeded the ${MAX_RESPONSE_BYTES}-byte cap`);
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
  return body + decoder.decode();
};

const extractMarkdown = (rawResponse: string): string => {
  const response = JSON.parse(rawResponse) as {
    data?: { markdown?: unknown; content?: unknown; text?: unknown };
    markdown?: unknown;
    content?: unknown;
    text?: unknown;
  };
  const payload = response.data ?? response;
  for (const candidate of [payload.markdown, payload.content, payload.text]) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return '';
};

/**
 * Access-challenge interstitials front-load multiple cues (or are tiny pages
 * whose only substance is one cue). An incidental phrase mid-article, such as
 * an HTTP "access denied" log line inside a real threat write-up, must not
 * discard the render.
 */
const isAccessChallengePage = (renderedText: string): boolean => {
  if (renderedText.length >= 10_000) return false;
  const lower = renderedText.toLowerCase();
  const head = lower.slice(0, CHALLENGE_HEAD_CHARS);
  const headMarkers = CHALLENGE_MARKERS.filter((marker) => head.includes(marker));
  if (headMarkers.length >= 2) return true;
  if (headMarkers.length === 1 && renderedText.length < CHALLENGE_TINY_PAGE_CHARS) {
    const withoutMarker = head.split(headMarkers[0]).join('').replace(/\s+/g, ' ').trim();
    return withoutMarker.length < 200;
  }
  return false;
};

const validateRender = (
  renderedText: string,
  rssBodyText: string
): { valid: true } | { valid: false; reason: string } => {
  if (renderedText.length < MIN_RENDER_CHARS) {
    return { valid: false, reason: `render_too_short:${renderedText.length}` };
  }
  if (isAccessChallengePage(renderedText)) {
    return { valid: false, reason: 'render_is_access_challenge' };
  }
  const relativeMinimum = Math.min(2_000, Math.floor(rssBodyText.length * 0.25));
  if (rssBodyText.length >= 1_000 && renderedText.length < relativeMinimum) {
    return {
      valid: false,
      reason: `render_shorter_than_rss:${renderedText.length}/${rssBodyText.length}`,
    };
  }
  return { valid: true };
};

const fallbackOutput = ({
  input,
  now,
  status,
  fallbackReason,
  renderedBodyText = '',
  renderedChars = renderedBodyText.length,
}: {
  input: MaterializeArticleInput;
  now: Date;
  status: 'fallback' | 'retryable_fallback' | 'skipped';
  fallbackReason: string;
  renderedBodyText?: string;
  renderedChars?: number;
}): MaterializeArticleOutput => ({
  body_text: input.rss_body_text,
  rendered_body_text: renderedBodyText,
  materialization: {
    provider: 'jina',
    status,
    attempted_at: now.toISOString(),
    source_url: input.article_url,
    rendered_chars: renderedChars,
    truncated: false,
    reason: fallbackReason,
  },
});

export interface MaterializeArticleDependencies {
  fetchFn?: typeof fetch;
  lookupFn?: DnsLookupFn;
  now?: () => Date;
  pace?: (abortSignal: AbortSignal) => Promise<void>;
}

export const materializeArticle = async (
  input: MaterializeArticleInput,
  abortSignal: AbortSignal,
  dependencies: MaterializeArticleDependencies = {}
): Promise<MaterializeArticleOutput> => {
  const now = (dependencies.now ?? (() => new Date()))();
  if (input.source_type !== 'rss') {
    return fallbackOutput({
      input,
      now,
      status: 'skipped',
      fallbackReason: 'source_is_not_rss',
    });
  }
  // Strip userinfo before any network call or persisted source_url so embedded
  // credentials cannot reach Jina or land in materialization metadata.
  const articleUrl = normalizeProvenanceUrl(input.article_url) ?? '';
  const safeInput = { ...input, article_url: articleUrl };

  if (input.existing_status === 'rendered' && input.existing_rendered_body_text.trim()) {
    return {
      body_text: input.existing_rendered_body_text,
      rendered_body_text: input.existing_rendered_body_text,
      materialization: {
        provider: 'jina',
        status: 'rendered',
        attempted_at: now.toISOString(),
        source_url: articleUrl,
        rendered_chars: input.existing_rendered_body_text.length,
        truncated: input.existing_rendered_body_text.length >= MAX_ARTICLE_CHARS,
        reason: 'cached_render',
      },
    };
  }
  if (!articleUrl) {
    return fallbackOutput({
      input: safeInput,
      now,
      status: 'skipped',
      fallbackReason: input.article_url ? 'article_url_invalid' : 'article_url_missing',
    });
  }

  try {
    await validateArticleUrl(articleUrl, abortSignal, dependencies.lookupFn);
    await (dependencies.pace ?? paceUnauthenticatedRequest)(abortSignal);

    const controller = new AbortController();
    const onAbort = () => controller.abort(abortSignal.reason);
    if (abortSignal.aborted) controller.abort(abortSignal.reason);
    else abortSignal.addEventListener('abort', onAbort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new Error(`Jina request timed out after ${REQUEST_TIMEOUT_MS}ms`)),
      REQUEST_TIMEOUT_MS
    );

    let rawResponse: string;
    try {
      // PR decision: should production require an authenticated `.jina` connector,
      // or retain unauthenticated Reader as a supported fallback? The MVP deliberately
      // sends no Authorization header.
      const response = await (dependencies.fetchFn ?? globalThis.fetch)(JINA_READER_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Kibana-ThreatIntel/1.0 (+https://www.elastic.co/security)',
        },
        body: JSON.stringify({
          url: articleUrl,
          respondWith: 'markdown',
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Jina Reader returned HTTP ${response.status}`);
      }
      rawResponse = await readResponseWithCap(response);
    } finally {
      clearTimeout(timeout);
      abortSignal.removeEventListener('abort', onAbort);
    }

    const rendered = extractMarkdown(rawResponse);
    const validation = validateRender(rendered, input.rss_body_text);
    if (!validation.valid) {
      return fallbackOutput({
        input: safeInput,
        now,
        status: 'fallback',
        fallbackReason: validation.reason,
        renderedChars: rendered.length,
      });
    }

    const truncated = rendered.length > MAX_ARTICLE_CHARS;
    const renderedBodyText = sliceWithoutSplittingSurrogatePair(rendered, MAX_ARTICLE_CHARS);
    return {
      body_text: renderedBodyText,
      rendered_body_text: renderedBodyText,
      materialization: {
        provider: 'jina',
        status: 'rendered',
        attempted_at: now.toISOString(),
        source_url: articleUrl,
        rendered_chars: rendered.length,
        truncated,
        reason: truncated ? 'rendered_and_truncated' : 'rendered',
      },
    };
  } catch (error) {
    return fallbackOutput({
      input: safeInput,
      now,
      status: isRetryableMaterializationError(error) ? 'retryable_fallback' : 'fallback',
      fallbackReason: reason(error),
    });
  }
};
