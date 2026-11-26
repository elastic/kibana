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
  SWEEP_TEST_TIMEOUT_MS,
  namesFor,
  setupBlock,
  sweepUntilGate,
  teardownBlock,
  verifyBlocked,
} from '../fixtures/unreadable_scope_block';

const RUN = Date.now();
const NAMES = namesFor('b', RUN);

/**
 * The Hunt sweep gate when the default data view holds nothing searchable: a readable-by-nobody
 * custom name and a hidden alias. The sweep still stops at the gate, as it always has.
 */
apiTest.describe(
  'Hunt Watch - scope check with nothing searchable in the default data view',
  { tag: [...tags.stateful.classic] },
  () => {
    // Stays unset when `setupBlock` throws; `teardownBlock` handles that.
    let state: BlockState;
    const patterns = [NAMES.customIndex, NAMES.hiddenAlias];

    apiTest.beforeAll(async ({ apiServices, samlAuth, apiClient, esClient }) => {
      state = await setupBlock({
        fixtures: { apiServices, samlAuth, apiClient, esClient },
        names: NAMES,
        withLogsStream: false,
        patterns,
      });
    });

    apiTest.afterAll(async ({ apiServices, apiClient, esClient }) => {
      await teardownBlock({
        fixtures: { apiServices, apiClient, esClient },
        names: NAMES,
        withLogsStream: false,
        state,
      });
    });

    apiTest('still blocks the sweep at the gate', async ({ apiClient }) => {
      apiTest.setTimeout(SWEEP_TEST_TIMEOUT_MS);
      const { gate, workerState } = await sweepUntilGate({ apiClient, names: NAMES, state });
      const coverageResponse = await apiClient.get(
        spaceUrl(HUNT_WORKER_INDEX_COVERAGE_URL, NAMES.space),
        { headers: state.headers, responseType: 'json' }
      );
      expect(coverageResponse.statusCode).toBe(200);
      const coverage = coverageResponse.body as HuntWorkerIndexCoverageResponse;

      const mismatches = await verifyBlocked({
        names: NAMES,
        gate,
        apiClient,
        headers: state.headers,
        workerState,
        coverage,
      });
      expect(mismatches).toStrictEqual([]);
    });
  }
);
