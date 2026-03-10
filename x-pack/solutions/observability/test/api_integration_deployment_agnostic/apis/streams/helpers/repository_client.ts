/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { CustomRoleScopedSupertestProvider } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/custom_role_scoped_supertest';
import { RoleScopedSupertestProvider } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services/role_scoped_supertest';
import {
  RepositorySupertestClient,
  getAdminApiClient,
  getCustomRoleApiClient,
} from '../../../../common/utils/server_route_repository/create_admin_service_from_repository';

export type StreamsSupertestRepositoryClient = RepositorySupertestClient<StreamsRouteRepository>;

export async function createStreamsRepositoryAdminClient(
  st: ReturnType<typeof RoleScopedSupertestProvider>
): Promise<StreamsSupertestRepositoryClient> {
  return getAdminApiClient<StreamsRouteRepository>(st);
}

export async function createStreamsRepositoryCustomRoleClient(
  st: ReturnType<typeof CustomRoleScopedSupertestProvider>
): Promise<StreamsSupertestRepositoryClient> {
  return getCustomRoleApiClient<StreamsRouteRepository>(st);
}
