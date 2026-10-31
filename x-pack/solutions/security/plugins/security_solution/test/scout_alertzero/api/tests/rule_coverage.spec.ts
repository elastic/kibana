/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest, getAdminApi, tags, testData } from '../fixtures';
import {
  COVERAGE_SWEEP_OUTPUT_TYPES,
  COVERAGE_SWEEP_WORKFLOW_ID,
  readExecutionOutput,
  runWorkflow,
} from '../fixtures/rule_coverage_helpers';

// Playwright's own timeout must outlast the inner poll, or a slow sweep surfaces as a generic
// Playwright timeout instead of the poll's message naming the execution's last state.
const TEST_TIMEOUT_MS = testData.ACTION_TIMEOUT_MS + 2 * 60_000;

/**
 * Runs the global coverage sweep by hand. The per-space Rule Coverage worker is not used here:
 * it forwards only `autonomy_level`, `lookback_days` and `batch_size`, so it cannot carry an
 * `ai_index_id` to the sweep. The sweep itself calls no model.
 *
 * Every sweep runs against an AI index this suite owns (created empty, deleted afterwards), not
 * the default space's shared indicator queue: a sweep over the shared queue starts one detached
 * review per pending indicator, work the suite neither tracks nor cleans up. An empty owned
 * queue also pins the counts the sweep reports: nothing pending, nothing started.
 */
apiTest.describe('AlertZero e2e - rule coverage', { tag: [...tags.stateful.classic] }, () => {
  const ownedEsIndices: string[] = [];

  /** Creates an empty, test-owned AI index and returns its id as the sweep takes it. */
  const createOwnedAiIndex = async (esClient: EsClient): Promise<string> => {
    const aiIndexId = `alertzero-e2e-coverage-${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const esIndex = `ai-index-idx-${aiIndexId}`;
    await esClient.indices.create({ index: esIndex });
    ownedEsIndices.push(esIndex);
    return aiIndexId;
  };

  apiTest.afterAll(async ({ esClient }) => {
    for (const index of ownedEsIndices) {
      // A 404 means an earlier teardown already removed it.
      await esClient.indices.delete({ index }, { ignore: [404] });
    }
  });

  apiTest(
    'completes a coverage sweep and reports its counts',
    async ({ apiClient, esClient, samlAuth }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const api = await getAdminApi(apiClient, samlAuth);
      const aiIndexId = await createOwnedAiIndex(esClient);

      const sweep = await runWorkflow(
        api,
        COVERAGE_SWEEP_WORKFLOW_ID,
        { ai_index_id: aiIndexId, batch_size: 1, lookback_days: 1 },
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      expect(sweep.status).toBe('completed');

      const output = await readExecutionOutput(api, sweep.id);
      for (const [field, type] of Object.entries(COVERAGE_SWEEP_OUTPUT_TYPES)) {
        expect(typeof output[field]).toBe(type);
      }
      // The owned queue is empty and its index exists, so the search succeeded and the sweep had
      // nothing to dispatch: no review was started that teardown would have to chase.
      expect(output.search_failed).toBe(false);
      expect(output.pending).toBe(0);
      expect(output.started).toBe(0);
    }
  );

  // Known gap, expected to fail until security-team#19988 (fix: elastic/kibana#296929) lands:
  // a sweep over an AI index that does not exist yet must complete with `search_failed: false`,
  // since a space that has produced no indicator has nothing to review. Today the search throws
  // index_not_found and the sweep reports `search_failed: true`. The index id is minted per run
  // and never created, so it cannot collide with a real one.
  apiTest.fail(
    'treats an absent AI index as empty, not as an error (security-team#19988, elastic/kibana#296929)',
    async ({ apiClient, samlAuth }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);
      const api = await getAdminApi(apiClient, samlAuth);

      const sweep = await runWorkflow(
        api,
        COVERAGE_SWEEP_WORKFLOW_ID,
        {
          ai_index_id: `alertzero-e2e-absent-${Date.now().toString(36)}${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          batch_size: 1,
          lookback_days: 1,
        },
        { timeoutMs: testData.ACTION_TIMEOUT_MS }
      );
      const output = await readExecutionOutput(api, sweep.id);

      expect(sweep.status).toBe('completed');
      expect(output.search_failed).toBe(false);
    }
  );
});
