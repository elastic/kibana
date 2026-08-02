/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

/** react-query gives up after this many failures, whatever the error is. */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * The one `retry` predicate every PND query uses.
 *
 * Retries transport failures (no response at all) and 5xx responses, and gives
 * up immediately on a 4xx — a 403 or a 404 does not become truthy by asking
 * again.
 *
 * Note that a 503 is retried too: `workflowsManagement.management` can still be
 * wiring itself up while the first render lands, so the state that says
 * "Workflows unavailable" is reached after the retries rather than instead of
 * them.
 */
export const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= MAX_RETRY_ATTEMPTS) {
    return false;
  }

  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }

  return true;
};
