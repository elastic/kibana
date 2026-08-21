/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpHandler } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { NightshiftInvestigationsRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: unknown;
};

export type NightshiftInvestigationsClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type NightshiftInvestigationsRepositoryClient = RouteRepositoryClient<
  NightshiftInvestigationsRouteRepository,
  NightshiftInvestigationsClientOptions
>;

export type NightshiftInvestigationsEndpoint = keyof NightshiftInvestigationsRouteRepository;

export type NightshiftInvestigationsAPIReturnType<
  TEndpoint extends NightshiftInvestigationsEndpoint
> = ReturnOf<NightshiftInvestigationsRouteRepository, TEndpoint>;

export type NightshiftInvestigationsAPIClientRequestParamsOf<
  TEndpoint extends NightshiftInvestigationsEndpoint
> = ClientRequestParamsOf<NightshiftInvestigationsRouteRepository, TEndpoint>;

export function createNightshiftInvestigationsRepositoryClient(core: {
  http: { fetch: HttpHandler };
}): NightshiftInvestigationsRepositoryClient {
  return createRepositoryClient(core);
}
