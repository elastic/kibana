/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { NightshiftSourcesRouteRepository } from '../server';

export type NightshiftSourcesRepositoryClient = RouteRepositoryClient<
  NightshiftSourcesRouteRepository,
  Omit<HttpFetchOptions, 'body' | 'query' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
  }
>;

export function createNightshiftSourcesRepositoryClient(core: {
  http: { fetch: HttpHandler };
}): NightshiftSourcesRepositoryClient {
  return createRepositoryClient(core);
}
