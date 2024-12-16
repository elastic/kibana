/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, HttpFetchOptions } from '@kbn/core/public';
import type {
  ClientRequestParamsOf,
  ReturnOf,
  RouteRepositoryClient,
} from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { InvestigateAppServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type InvestigateAppAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type InvestigateAppRepositoryClient = RouteRepositoryClient<
  InvestigateAppServerRouteRepository,
  InvestigateAppAPIClientOptions
>;

export type AutoAbortedInvestigateAppRepositoryClient = RouteRepositoryClient<
  InvestigateAppServerRouteRepository,
  Omit<InvestigateAppAPIClientOptions, 'signal'>
>;

export type InvestigateAppAPIEndpoint = keyof InvestigateAppServerRouteRepository;

export type APIReturnType<TEndpoint extends InvestigateAppAPIEndpoint> = ReturnOf<
  InvestigateAppServerRouteRepository,
  TEndpoint
>;

export type InvestigateAppAPIClientRequestParamsOf<TEndpoint extends InvestigateAppAPIEndpoint> =
  ClientRequestParamsOf<InvestigateAppServerRouteRepository, TEndpoint>;

export function createInvestigateAppRepositoryClient(core: CoreStart | CoreSetup) {
  return createRepositoryClient(core) as InvestigateAppRepositoryClient;
}
