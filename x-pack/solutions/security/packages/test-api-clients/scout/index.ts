/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerFixture } from '@playwright/test';
import { apiClientFixture } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { SecuritySolutionScoutApiServiceProvider as createDetectionsApi } from './detections.gen';
import { SecuritySolutionScoutApiServiceProvider as createDiscoveriesApi } from './discoveries.gen';
import { SecuritySolutionScoutApiServiceProvider as createEndpointExceptionsApi } from './endpoint_exceptions.gen';
import { SecuritySolutionScoutApiServiceProvider as createEndpointManagementApi } from './endpoint_management.gen';
import { SecuritySolutionScoutApiServiceProvider as createEntityAnalyticsApi } from './entity_analytics.gen';
import { SecuritySolutionScoutApiServiceProvider as createExceptionsApi } from './exceptions.gen';
import { SecuritySolutionScoutApiServiceProvider as createListsApi } from './lists.gen';
import { SecuritySolutionScoutApiServiceProvider as createOsqueryApi } from './osquery.gen';
import { SecuritySolutionScoutApiServiceProvider as createTimelinesApi } from './timelines.gen';

export type { ScoutApiRequestOptions } from './detections.gen';

export type DetectionsApi = ReturnType<typeof createDetectionsApi>;
export type DiscoveriesApi = ReturnType<typeof createDiscoveriesApi>;
export type EndpointExceptionsApi = ReturnType<typeof createEndpointExceptionsApi>;
export type EndpointManagementApi = ReturnType<typeof createEndpointManagementApi>;
export type EntityAnalyticsApi = ReturnType<typeof createEntityAnalyticsApi>;
export type ExceptionsApi = ReturnType<typeof createExceptionsApi>;
export type ListsApi = ReturnType<typeof createListsApi>;
export type OsqueryApi = ReturnType<typeof createOsqueryApi>;
export type TimelinesApi = ReturnType<typeof createTimelinesApi>;

/**
 * Worker-scoped Scout fixtures exposing the generated Security Solution API clients, named after the
 * FTR services they mirror (`detectionsApi`, `exceptionsApi`, ...).
 */
export interface SecuritySolutionApiFixtures {
  detectionsApi: DetectionsApi;
  discoveriesApi: DiscoveriesApi;
  endpointExceptionsApi: EndpointExceptionsApi;
  endpointManagementApi: EndpointManagementApi;
  entityAnalyticsApi: EntityAnalyticsApi;
  exceptionsApi: ExceptionsApi;
  listsApi: ListsApi;
  osqueryApi: OsqueryApi;
  timelinesApi: TimelinesApi;
}

/**
 * Merge into a Scout test type to get the generated clients as fixtures, e.g.
 * `export const apiTest = mergeTests(baseApiTest, securitySolutionApiFixture);`.
 *
 * The clients wrap the unauthenticated `apiClient` fixture, so callers pass credentials via
 * `options.headers` (an API key header from `requestAuth` or a cookie header from `samlAuth`).
 */
export const securitySolutionApiFixture = apiClientFixture.extend<{}, SecuritySolutionApiFixtures>({
  detectionsApi: createApiFixture(createDetectionsApi),
  discoveriesApi: createApiFixture(createDiscoveriesApi),
  endpointExceptionsApi: createApiFixture(createEndpointExceptionsApi),
  endpointManagementApi: createApiFixture(createEndpointManagementApi),
  entityAnalyticsApi: createApiFixture(createEntityAnalyticsApi),
  exceptionsApi: createApiFixture(createExceptionsApi),
  listsApi: createApiFixture(createListsApi),
  osqueryApi: createApiFixture(createOsqueryApi),
  timelinesApi: createApiFixture(createTimelinesApi),
});

export {
  createDetectionsApi,
  createDiscoveriesApi,
  createEndpointExceptionsApi,
  createEndpointManagementApi,
  createEntityAnalyticsApi,
  createExceptionsApi,
  createListsApi,
  createOsqueryApi,
  createTimelinesApi,
};

function createApiFixture<TApi>(
  createApi: (apiClient: ApiClientFixture) => TApi
): [WorkerFixture<TApi, { apiClient: ApiClientFixture }>, { scope: 'worker' }] {
  return [
    async ({ apiClient }, use) => {
      await use(createApi(apiClient));
    },
    { scope: 'worker' },
  ];
}
