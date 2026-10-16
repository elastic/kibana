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
import type { SignificantEventsRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: unknown;
};

export type SignificantEventsRepositoryClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type SignificantEventsRepositoryClient = RouteRepositoryClient<
  SignificantEventsRouteRepository,
  SignificantEventsRepositoryClientOptions
>;

export type SignificantEventsRepositoryEndpoint = keyof SignificantEventsRouteRepository;

export type SignificantEventsAPIReturnType<TEndpoint extends SignificantEventsRepositoryEndpoint> =
  ReturnOf<SignificantEventsRouteRepository, TEndpoint>;

export type SignificantEventsAPIClientRequestParamsOf<
  TEndpoint extends SignificantEventsRepositoryEndpoint
> = ClientRequestParamsOf<SignificantEventsRouteRepository, TEndpoint>;

export function createSignificantEventsRepositoryClient(core: {
  http: { fetch: HttpHandler };
}): SignificantEventsRepositoryClient {
  return createRepositoryClient(core);
}
