/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Small helpers shared by every module that talks to Kibana through the evals `fetch` fixture.
 * That fixture is a `KbnClient` adapter: it ignores the `version` fetch option (only the
 * `elastic-api-version` header is sent), sets `kbn-xsrf` and `x-elastic-internal-origin` itself,
 * and throws `KbnClientRequesterError`, which carries the HTTP status.
 */

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const spacePath = (spaceId: string, path: string): string =>
  `/s/${encodeURIComponent(spaceId)}${path}`;

export const apiVersion = (version: string): Record<string, string> => ({
  'elastic-api-version': version,
});

export const httpStatus = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

/** Elasticsearch client errors carry the status under `meta`, not at the top level. */
export const isEsNotFound = (error: unknown): boolean =>
  (error as { meta?: { statusCode?: number } })?.meta?.statusCode === 404;

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
