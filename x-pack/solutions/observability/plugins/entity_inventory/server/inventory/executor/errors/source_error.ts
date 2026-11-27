/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceError } from '../../../../common';
import { asNumber, asText } from '../utils';

interface ErrorLike {
  message?: unknown;
  statusCode?: unknown;
  meta?: {
    statusCode?: unknown;
    body?: { error?: { type?: unknown; reason?: unknown } };
  };
}

/** The status and reason of a `failed` source error. */
export type ErrorDetail = Pick<SourceError, 'status' | 'reason'>;

/** Flattens any thrown value to a status and reason, never a stack or the raw body. */
export const toErrorDetail = (error: unknown): ErrorDetail => {
  const { message, statusCode, meta }: ErrorLike =
    typeof error === 'object' && error !== null ? error : {};
  const type = asText(meta?.body?.error?.type);
  const bodyReason = asText(meta?.body?.error?.reason);
  // A non-Error throwable such as a string carries its text as the value itself.
  const fallback = asText(message) ?? asText(error) ?? 'unknown error';
  const reason = bodyReason ? (type ? `${type}: ${bodyReason}` : bodyReason) : fallback;

  return {
    status: asNumber(meta?.statusCode) ?? asNumber(statusCode),
    reason,
  };
};

/**
 * Whether the error is an Elasticsearch `verification_exception`, read from the response body,
 * never from the message text.
 */
export const isVerificationError = (error: unknown): boolean => {
  const { meta }: ErrorLike = typeof error === 'object' && error !== null ? error : {};
  return meta?.body?.error?.type === 'verification_exception';
};
