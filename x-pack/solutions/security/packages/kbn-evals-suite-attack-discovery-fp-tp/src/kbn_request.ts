/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { FpTpLiveKbnRequest } from './world';

const statusOf = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }
  return typeof error.status === 'number' ? error.status : undefined;
};

/**
 * Adapts the evals `fetch` fixture, which throws on HTTP errors, to the seeding
 * helpers' request shape, which reads the status code instead.
 */
export const kbnRequestFromFetch =
  (fetch: HttpHandler): FpTpLiveKbnRequest =>
  async ({ method, path, body, version }) => {
    try {
      const response = await fetch(path, {
        method,
        version,
        headers: version ? { 'elastic-api-version': version } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { statusCode: 200, body: response };
    } catch (error) {
      const statusCode = statusOf(error);
      if (statusCode === undefined) {
        throw error;
      }
      return { statusCode, body: error instanceof Error ? error.message : error };
    }
  };
