/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryApiClient } from './client';
import { buildListResponseFixture, TYPES_RESPONSE_FIXTURE } from './fixture_data';

const createAbortError = (): Error => {
  const error = new Error('The request was aborted');
  error.name = 'AbortError';
  return error;
};

export const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

/** Client over static fixtures, for tests only; the app reads the routes through the HTTP client. */
export const createFixtureEntityInventoryApiClient = (): EntityInventoryApiClient => ({
  getTypes: async ({ signal }) => {
    throwIfAborted(signal);
    return TYPES_RESPONSE_FIXTURE;
  },
  getEntities: async (type, _request, { signal }) => {
    throwIfAborted(signal);
    const response = buildListResponseFixture(type);
    if (!response) {
      throw new Error(`Entity type "${type}" not found`);
    }
    return response;
  },
});
