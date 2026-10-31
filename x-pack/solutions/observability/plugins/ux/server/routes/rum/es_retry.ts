/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** CCS scorecard queries often exceed the default 30s on a cold first load. */
export const RUM_ES_REQUEST_TIMEOUT = '90s';

export const rumEsSearchOptions = {
  requestTimeout: RUM_ES_REQUEST_TIMEOUT,
} as const;

export const isRumEsTimeout = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const name = 'name' in error ? String(error.name) : '';
  const message = 'message' in error ? String(error.message) : '';
  return name === 'TimeoutError' || message.includes('Request timed out');
};

export const withRumEsRetry = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (!isRumEsTimeout(error)) {
      throw error;
    }
    return run();
  }
};
