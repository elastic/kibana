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
import type { InventoryServerRouteRepository } from '../../server';

type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
  body?: any;
};

export type InventoryAPIClientOptions = Omit<
  FetchOptions,
  'query' | 'body' | 'pathname' | 'signal'
> & {
  signal: AbortSignal | null;
};

export type InventoryAPIClient = RouteRepositoryClient<
  InventoryServerRouteRepository,
  InventoryAPIClientOptions
>;

export type AutoAbortedInventoryAPIClient = RouteRepositoryClient<
  InventoryServerRouteRepository,
  Omit<InventoryAPIClientOptions, 'signal'>
>;

export type InventoryAPIEndpoint = keyof InventoryServerRouteRepository;

export type APIReturnType<TEndpoint extends InventoryAPIEndpoint> = ReturnOf<
  InventoryServerRouteRepository,
  TEndpoint
>;

export type InventoryAPIClientRequestParamsOf<TEndpoint extends InventoryAPIEndpoint> =
  ClientRequestParamsOf<InventoryServerRouteRepository, TEndpoint>;

export function createCallInventoryAPI(core: CoreStart | CoreSetup): InventoryAPIClient {
  return createRepositoryClient(core);
}
