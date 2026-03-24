/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiServicesFixture } from '@kbn/scout-oblt';
import { apiTest as obltApiTest, mergeTests, sloDataFixture } from '@kbn/scout-oblt';
import {
  setupSloFtrDataForgeSuite,
  teardownSloFtrDataForgeSuite,
} from './slo_data_forge_lifecycle';
import { createSloScoutApi, mergeSloApiHeaders, type SloScoutApi } from './slo_scout_api';

export type SloPluginApiServicesFixture = ApiServicesFixture & { slo: SloScoutApi };

const apiTestWithSloServices = obltApiTest.extend<{}, { apiServices: SloPluginApiServicesFixture }>(
  {
    apiServices: [
      async ({ apiServices, apiClient, requestAuth }, use) => {
        const adminCredentials = await requestAuth.getApiKey('admin');
        const slo = createSloScoutApi(apiClient, mergeSloApiHeaders(adminCredentials.apiKeyHeader));
        await use({ ...apiServices, slo });
      },
      { scope: 'worker' },
    ],
  }
);

/**
 * `apiTest` from `@kbn/scout-oblt` plus `apiServices.slo` and `sloData`, without FTR data-forge lifecycle.
 * For embeddable-only specs use `mergeTests` with `import { apiTest as scoutApiTest, mergeTests, sloDataFixture } from '@kbn/scout-oblt'`.
 */
export const apiTestWithoutDataForge = mergeTests(apiTestWithSloServices, sloDataFixture);

/** FTR-style data-forge lifecycle: call `setup` from `beforeAll` and `teardown` from `afterAll`. */
export interface SloFtrDataForgeSuite {
  setup(): Promise<void>;
  teardown(): Promise<void>;
}

export interface SloFtrDataForgeSuiteWorkerFixtures {
  sloFtrDataForgeSuite: SloFtrDataForgeSuite;
}

/**
 * `apiTestWithoutDataForge` plus worker `sloFtrDataForgeSuite` — call
 * `sloFtrDataForgeSuite.setup()` / `teardown()` in suite hooks (not auto-run).
 */
export const apiTest = apiTestWithoutDataForge.extend<{}, SloFtrDataForgeSuiteWorkerFixtures>({
  sloFtrDataForgeSuite: [
    async ({ apiServices, esClient, kbnClient, log }, use) => {
      const deps = { apiServices, esClient, kbnClient, log };
      const suite: SloFtrDataForgeSuite = {
        async setup() {
          await setupSloFtrDataForgeSuite(deps);
        },
        async teardown() {
          await teardownSloFtrDataForgeSuite(deps);
        },
      };
      await use(suite);
    },
    { scope: 'worker' },
  ],
});

export {
  COMMON_HEADERS,
  DASHBOARD_API_PATH,
  SLO_BURN_RATE_EMBEDDABLE_ID,
  SLO_ERROR_BUDGET_ID,
  SLO_OVERVIEW_EMBEDDABLE_ID,
} from './constants';
export {
  SLO_FTR_DATA_VIEW_ID,
  SLO_FTR_DATA_VIEW_ID_HEALTH_SCAN,
  SLO_FTR_DATA_VIEW_TITLE,
  createSloFtrDataView,
  deleteSloFtrDataView,
  installSloFtrDataForge,
  removeSloFtrDataForge,
} from './slo_data_forge_lifecycle';
export { createSloPipelineAssertions, type SloPipelineAssertions } from './slo_pipeline_assertions';
export { createSloScoutApi, mergeSloApiHeaders, type SloScoutApi } from './slo_scout_api';
export {
  cleanupSloSummaryDocs,
  countSloSummaryDocs,
  insertSloSummaryDocs,
  refreshSloSummaryIndex,
} from './slo_summary_index_test_helpers';
export { pollUntilTrue, sleep } from './slo_poll';
export {
  createSloTransformAssertions,
  type SloTransformAssertions,
} from './slo_transform_assertions';
export {
  DEFAULT_SLO,
  TEST_SPACE_ID,
  createApmSummaryDoc,
  createDummySummaryDoc,
  createGroupedSummaryDoc,
} from './slo_test_data';
