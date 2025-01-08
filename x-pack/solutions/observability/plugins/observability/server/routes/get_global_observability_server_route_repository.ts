/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointOf } from '@kbn/server-route-repository';
import { ObservabilityConfig } from '..';
import { aiAssistantRouteRepository } from './assistant/route';
import { rulesRouteRepository } from './rules/route';

export function getObservabilityServerRouteRepository(config: ObservabilityConfig) {
  const repository = {
    ...aiAssistantRouteRepository,
    ...rulesRouteRepository,
  };
  return repository;
}

export type ObservabilityServerRouteRepository = ReturnType<
  typeof getObservabilityServerRouteRepository
>;

export type APIEndpoint = EndpointOf<ObservabilityServerRouteRepository>;
