/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

/**
 * Retries on transient failures (network errors and 5xx responses), stops
 * after 3 attempts. 4xx errors are not transient — they indicate a caller
 * or server-configuration problem that a retry cannot fix. 501 is excluded
 * explicitly because it signals that the feature is not available on this
 * deployment (not a network blip).
 */
export const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    const status = error.response?.status;
    if (status === 501) {
      return false;
    }
    return !status || status >= 500;
  }
  return true;
};
