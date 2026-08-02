/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const asNonBlankString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/**
 * Reads a human-readable message off an unknown query or mutation error.
 *
 * ⛔ Never read `error.body.message` unconditionally: a Kibana **404 has no
 * body at all**, so that access throws and replaces a recoverable "not found"
 * toast with a render crash. Everything here is defensive for that reason.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (isHttpFetchError(error)) {
    const bodyMessage = asNonBlankString(asRecord(error.body)?.message);

    if (bodyMessage != null) {
      return bodyMessage;
    }
  }

  if (error instanceof Error) {
    const errorMessage = asNonBlankString(error.message);

    if (errorMessage != null) {
      return errorMessage;
    }
  }

  return fallback;
};
