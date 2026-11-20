/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_WORKER_INDEX_COVERAGE_URL } from '@kbn/alertzero-common';
import type { HuntWorkerIndexCoverageResponse } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import { apiTest, spaceUrl, tags } from '../fixtures';
import type { BlockState } from '../fixtures/unreadable_scope_block';
import {
  FAN_OUT_BUDGET_MS,
  SWEEP_TEST_TIMEOUT_MS,
  namesFor,
  setupBlock,
  sweepUntilGate,
  teardownBlock,
  verifyPartial,
} from '../fixtures/unreadable_scope_block';

const RUN = Date.now();
const NAMES = namesFor('a', RUN);

/**
 * The Hunt sweep gate against the shipped `alertzero_threat_hunt` role and a live
 * `_resolve/index`: a default data view holding names the worker cannot read must not block the
 * sweep. The fake `.gen-ai` connector makes any later step fail; the gate runs before any model
 * call.
 */
apiTest.describe(
  'Hunt Watch - scope check with unreadable names in the default data view',
  { tag: [...tags.stateful.classic] },
  () => {
    // Stays unset when `setupBlock` throws; `teardownBlock` handles that.
    let state: BlockState;
    const patterns = [
      NAMES.logsPattern,
      NAMES.customIndex,
      NAMES.customAlias,
      NAMES.absent,
      NAMES.closedIndex,
      NAMES.hiddenAlias,
    ];

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      state = await setupBlock({
        fixtures: { apiServices, samlAuth, apiClient, esClient },
        names: NAMES,
        withLogsStream: true,
        patterns,
      });
    });

    apiTest.afterAll(async ({ apiServices, apiClient, esClient }) => {
      await teardownBlock({
        fixtures: { apiServices, apiClient, esClient },
        names: NAMES,
        withLogsStream: true,
        state,
      });
    });

    apiTest(
      'hunts the readable names and records the rest, with the real service account',
      async ({ apiClient }) => {
        apiTest.setTimeout(SWEEP_TEST_TIMEOUT_MS);
        const { gate, workerState } = await sweepUntilGate({
          apiClient,
          names: NAMES,
          state,
          budgetMs: FAN_OUT_BUDGET_MS,
        });
        const coverageResponse = await apiClient.get(
          spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, NAMES.space),
          { headers: state.headers, responseType: 'json' }
        );
        expect(coverageResponse.statusCode).toBe(200);
        const coverage = coverageResponse.body as HuntWorkerIndexCoverageResponse;

        const mismatches = await verifyPartial({
          names: NAMES,
          gate,
          apiClient,
          headers: state.headers,
          workerState,
          coverage,
        });
        expect(mismatches).toStrictEqual([]);
      }
    );
  }
);
