/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A failed query against one source, safe to return to the caller. */
export interface SourceError {
  indexPattern: string;
  /** The HTTP status Elasticsearch answered with, null when there was no response. */
  status: number | null;
  reason: string;
}

interface ErrorLike {
  message?: unknown;
  statusCode?: unknown;
  meta?: {
    statusCode?: unknown;
    body?: { error?: { type?: unknown; reason?: unknown } };
  };
}

const asNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** Flattens any thrown value to a status and reason, never a stack or the raw body. */
export const toSourceError = (indexPattern: string, error: unknown): SourceError => {
  const { message, statusCode, meta }: ErrorLike =
    typeof error === 'object' && error !== null ? error : {};
  const type = asText(meta?.body?.error?.type);
  const bodyReason = asText(meta?.body?.error?.reason);
  // A non-Error throwable such as a string carries its text as the value itself.
  const fallback = asText(message) ?? asText(error) ?? 'unknown error';
  const reason = bodyReason ? (type ? `${type}: ${bodyReason}` : bodyReason) : fallback;

  return {
    indexPattern,
    status: asNumber(meta?.statusCode) ?? asNumber(statusCode),
    reason,
  };
};
