/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryApiClient } from './client';
import type { FixtureScenario } from './fixtures';
import { buildListResponseFixture, TYPES_RESPONSE_FIXTURE } from './fixtures';

export type { FixtureScenario } from './fixtures';

export interface FixtureEntityInventoryApiClientOptions {
  /** The list response returned for every known type. Defaults to `normal`. */
  scenario?: FixtureScenario;
  /** When set, every list request rejects with this error. */
  failWith?: Error;
}

const createAbortError = (): Error => {
  const error = new Error('The request was aborted');
  error.name = 'AbortError';
  return error;
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

/** Client over static fixtures; it backs the app until the inventory routes exist (#6304). */
export const createFixtureEntityInventoryApiClient = ({
  scenario = 'normal',
  failWith,
}: FixtureEntityInventoryApiClientOptions = {}): EntityInventoryApiClient => ({
  getTypes: async ({ signal }) => {
    throwIfAborted(signal);
    return TYPES_RESPONSE_FIXTURE;
  },
  listEntities: async (type, _request, { signal }) => {
    throwIfAborted(signal);
    if (failWith) {
      throw failWith;
    }
    const response = buildListResponseFixture(type, scenario);
    if (!response) {
      throw new Error(`Entity type "${type}" not found`);
    }
    return response;
  },
});
