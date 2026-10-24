/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import type { SessionAction } from './session_replay';

/** Client-side HTTP destination rollup (page detail or session timeline). */
export interface RumBackendCall {
  origin: string;
  count: number;
  failCount: number;
  avgDurationMs: number | null;
  sampleTraceId: string | null;
  /** `peer.service` when the client span stamped one; otherwise null. */
  serviceName: string | null;
}

export const TRACE_RANGE_PAD_MS = 5 * 60 * 1000;

/** APM unified-traces routes reject datemath; they need ISO start/end. */
export const resolveTimeRange = (
  rangeFrom: string,
  rangeTo: string
): { rangeFrom: string; rangeTo: string } => {
  const from = datemath.parse(rangeFrom);
  const to = datemath.parse(rangeTo, { roundUp: true });
  if (!from?.isValid() || !to?.isValid()) {
    return { rangeFrom, rangeTo };
  }
  return { rangeFrom: from.toISOString(), rangeTo: to.toISOString() };
};

/** Origin (scheme + host + port) from a URL, or the raw string if unparseable. */
export const originFromUrl = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = trimmed.includes('://')
      ? new URL(trimmed)
      : new URL(trimmed, 'http://invalid.local');
    if (url.hostname === 'invalid.local') {
      return url.pathname || trimmed;
    }
    return url.origin;
  } catch {
    const noQuery = trimmed.split('?')[0];
    return noQuery || null;
  }
};

/** Status code from session HTTP labels like `GET 500` or `POST 200`. */
export const statusFromHttpLabel = (label: string | null | undefined): number | null => {
  if (!label) {
    return null;
  }
  const match = label.match(/\b([1-5]\d{2})\b/);
  return match ? Number(match[1]) : null;
};

export const rangeAroundTimestamp = (
  iso: string | undefined,
  fallbackFrom: string,
  fallbackTo: string,
  padMs = TRACE_RANGE_PAD_MS
): { rangeFrom: string; rangeTo: string } => {
  if (!iso) {
    return { rangeFrom: fallbackFrom, rangeTo: fallbackTo };
  }
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) {
    return { rangeFrom: fallbackFrom, rangeTo: fallbackTo };
  }
  return {
    rangeFrom: new Date(timestamp - padMs).toISOString(),
    rangeTo: new Date(timestamp + padMs).toISOString(),
  };
};

/** Roll HTTP session actions into the same shape as the page-detail agg. */
export const summarizeBackendCallsFromActions = (
  actions: Array<Pick<SessionAction, 'kind' | 'label' | 'detail' | 'traceId'>>
): RumBackendCall[] => {
  const byOrigin = new Map<string, RumBackendCall>();
  for (const action of actions) {
    if (action.kind !== 'http') {
      continue;
    }
    const origin = originFromUrl(action.detail) ?? action.detail ?? 'unknown';
    const existing = byOrigin.get(origin);
    const status = statusFromHttpLabel(action.label);
    const failed = status != null && status >= 400;
    if (!existing) {
      byOrigin.set(origin, {
        origin,
        count: 1,
        failCount: failed ? 1 : 0,
        avgDurationMs: null,
        sampleTraceId: action.traceId ?? null,
        serviceName: null,
      });
      continue;
    }
    existing.count += 1;
    if (failed) {
      existing.failCount += 1;
    }
    if (!existing.sampleTraceId && action.traceId) {
      existing.sampleTraceId = action.traceId;
    }
  }
  return [...byOrigin.values()].sort((a, b) => b.count - a.count);
};
