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
import type { DetectionEngineRouteRepository } from '../server';

/** Typed client of the engine's HTTP API; endpoints, params and responses come from the server. */
export type DetectionEngineRepositoryClient = RouteRepositoryClient<
  DetectionEngineRouteRepository,
  Omit<HttpFetchOptions, 'body' | 'query' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
  }
>;

export type DetectionEngineEndpoint = keyof DetectionEngineRouteRepository;

/** Response type of one endpoint. */
export type DetectionEngineReturnOf<TEndpoint extends DetectionEngineEndpoint> = ReturnOf<
  DetectionEngineRouteRepository,
  TEndpoint
>;

/** Request params of one endpoint. */
export type DetectionEngineParamsOf<TEndpoint extends DetectionEngineEndpoint> =
  ClientRequestParamsOf<DetectionEngineRouteRepository, TEndpoint>;

export function createDetectionEngineRepositoryClient(core: {
  http: { fetch: HttpHandler };
}): DetectionEngineRepositoryClient {
  return createRepositoryClient(core);
}
