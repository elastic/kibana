/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestAuthFixture } from '@kbn/scout-oblt';
import type { ApiClientFixture, ApiServicesFixture } from '@kbn/scout-oblt';
import { apiTest as baseTest, mergeTests, sloDataFixture } from '@kbn/scout-oblt';
import { mergeSloApiHeaders } from './slo_api_http';
import { createSloLifecycleApi, type SloLifecycleApi } from '../services/slo_lifecycle_api_service';
import {
  createCompositeSloLifecycleApi,
  type CompositeSloLifecycleApi,
} from '../services/composite_slo_lifecycle_api_service';

export type SloPluginApiServicesFixture = ApiServicesFixture & {
  slo: SloLifecycleApi;
  compositeSlo: CompositeSloLifecycleApi;
};

const apiTestWithSloServices = baseTest.extend<{}, { apiServices: SloPluginApiServicesFixture }>({
  apiServices: [
    async (
      {
        apiServices,
        apiClient,
        requestAuth,
      }: {
        apiServices: ApiServicesFixture;
        apiClient: ApiClientFixture;
        requestAuth: RequestAuthFixture;
      },
      use: (extended: SloPluginApiServicesFixture) => Promise<void>
    ) => {
      const adminCredentials = await requestAuth.getApiKey('admin');
      const headers = mergeSloApiHeaders(adminCredentials.apiKeyHeader);
      const slo = createSloLifecycleApi(apiClient, headers);
      const compositeSlo = createCompositeSloLifecycleApi(apiClient, headers);
      const extendedApiServices: SloPluginApiServicesFixture = {
        ...apiServices,
        slo,
        compositeSlo,
      };
      await use(extendedApiServices);
    },
    { scope: 'worker' },
  ],
});

/**
 * Single SLO Scout API test entry: `@kbn/scout-oblt` `apiTest` + `apiServices.slo` + `sloData`.
 * The `fake_hosts` and `fake_stack` datasets and the composite SLO feature flag are set up once
 * per run by `tests/global.setup.ts`.
 */
export const apiTest = mergeTests(apiTestWithSloServices, sloDataFixture);

export { assertDashboardCreateSuccess } from './dashboard_assertions';
export {
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  SLO_ALERTS_EMBEDDABLE_ID,
  SLO_BURN_RATE_EMBEDDABLE_ID,
  SLO_ERROR_BUDGET_ID,
  SLO_OVERVIEW_EMBEDDABLE_ID,
} from './constants';
export { createSloPipelineAssertions, type SloPipelineAssertions } from './slo_pipeline_assertions';
export { mergeSloApiHeaders, sloApiPathWithQuery } from './slo_api_http';
export {
  cleanupSloSummaryDocs,
  countSloSummaryDocs,
  insertSloSummaryDocs,
  refreshSloSummaryIndex,
} from './slo_summary_index_test_helpers';
export { pollUntilTrue } from './slo_poll';
export {
  createSloTransformAssertions,
  type SloTransformAssertions,
} from './slo_transform_assertions';
export {
  DEFAULT_COMPOSITE_SLO,
  DEFAULT_SLO,
  TEST_SPACE_ID,
  createApmSummaryDoc,
  createDummySummaryDoc,
  createGroupedApmSummaryDoc,
  createGroupedSummaryDoc,
} from './slo_test_data';
