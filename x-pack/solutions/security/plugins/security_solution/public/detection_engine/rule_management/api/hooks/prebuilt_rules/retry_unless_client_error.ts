/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHttpFetchError } from '@kbn/core-http-browser';

const MAX_RETRIES = 3;

/**
 * Retries a failed request a few times, except when the server answered that the request itself is wrong
 * (4xx). Asking again for something that does not exist, or that is not allowed, never helps.
 */
export const retryUnlessClientError = (failureCount: number, error: unknown): boolean => {
  const status = isHttpFetchError(error) ? error.response?.status : undefined;
  const isClientError = status !== undefined && status >= 400 && status < 500;

  return !isClientError && failureCount < MAX_RETRIES;
};
