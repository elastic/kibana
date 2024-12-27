/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import supertest from 'supertest';
import {
  RepositorySupertestClient,
  getApiClientFromSupertest,
} from '../../../../common/utils/server_route_repository/create_supertest_service_from_repository';

export function createStreamsRepositorySupertestClient(
  st: supertest.Agent
): RepositorySupertestClient<StreamsRouteRepository> {
  return getApiClientFromSupertest<StreamsRouteRepository>(st);
}
