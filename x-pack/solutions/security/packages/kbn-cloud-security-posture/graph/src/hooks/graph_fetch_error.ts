/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphFetchErrorCategory } from '../components/graph_telemetry';

/** A failed graph data request. `statusCode` is missing when the server never responded. */
export class GraphFetchError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'GraphFetchError';
  }
}

/** Reduces a failed graph request to a coarse category; the error message is never exposed. */
export const getGraphFetchErrorCategory = (error: unknown): GraphFetchErrorCategory => {
  if (!(error instanceof GraphFetchError)) return 'unknown';

  const { statusCode } = error;
  if (statusCode === undefined) return 'network';
  if (statusCode === 401 || statusCode === 403) return 'forbidden';
  if (statusCode === 408 || statusCode === 504) return 'timeout';
  if (statusCode >= 400 && statusCode < 500) return 'client_error';
  if (statusCode >= 500 && statusCode < 600) return 'server_error';
  return 'unknown';
};
