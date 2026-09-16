/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiClientFixture } from '@kbn/scout';
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
  detectionsApi: [
    async ({ apiClient }, use) => {
      await use(createDetectionsApi(apiClient));
    },
    { scope: 'worker' },
  ],
  discoveriesApi: [
    async ({ apiClient }, use) => {
      await use(createDiscoveriesApi(apiClient));
    },
    { scope: 'worker' },
  ],
  endpointExceptionsApi: [
    async ({ apiClient }, use) => {
      await use(createEndpointExceptionsApi(apiClient));
    },
    { scope: 'worker' },
  ],
  endpointManagementApi: [
    async ({ apiClient }, use) => {
      await use(createEndpointManagementApi(apiClient));
    },
    { scope: 'worker' },
  ],
  entityAnalyticsApi: [
    async ({ apiClient }, use) => {
      await use(createEntityAnalyticsApi(apiClient));
    },
    { scope: 'worker' },
  ],
  exceptionsApi: [
    async ({ apiClient }, use) => {
      await use(createExceptionsApi(apiClient));
    },
    { scope: 'worker' },
  ],
  listsApi: [
    async ({ apiClient }, use) => {
      await use(createListsApi(apiClient));
    },
    { scope: 'worker' },
  ],
  osqueryApi: [
    async ({ apiClient }, use) => {
      await use(createOsqueryApi(apiClient));
    },
    { scope: 'worker' },
  ],
  timelinesApi: [
    async ({ apiClient }, use) => {
      await use(createTimelinesApi(apiClient));
    },
    { scope: 'worker' },
  ],
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
