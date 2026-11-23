/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, COMMON_HEADERS, RECONCILE_PATH, setNightshiftEnabled } from '../fixtures';

const RULES_PATH = 'api/alerting/v2/rules';
const SOURCES_PATH = 'internal/nightshift/sources';
/** Creating a source runs its query, so the index it reads must exist. */
const SOURCE_INDEX = 'nightshift-detection-scout-reconcile';
const RECONCILE_WORKFLOW_PATH =
  'api/workflows/workflow/system-nightshift-detection-reconcile-default';

/** The workflow waits 30 seconds for a burst of changes to settle, then reconciles. */
const WORKFLOW_RECONCILE_TIMEOUT_MS = 150_000;
const POLL_INTERVAL_MS = 5_000;

interface ReconcileResponse {
  status: 'completed' | 'busy';
  deleted?: number;
  failures?: unknown[];
}

/** A managed rule of a strategy that no longer exists, which any reconciliation deletes. */
const createRetiredStrategyRule = async ({
  apiClient,
  headers,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
}): Promise<string> => {
  const created = await apiClient.post(RULES_PATH, {
    headers,
    responseType: 'json',
    body: {
      kind: 'signal',
      metadata: {
        name: 'Retired strategy rule',
        tags: [
          'nightshift:detection_engine:managed',
          'nightshift:detection_engine:strategy:retired',
        ],
      },
      time_field: '@timestamp',
      schedule: { every: '5m', lookback: '5m' },
      query: { base: 'FROM logs-* | STATS count = COUNT(*)' },
    },
  });
  expect(created).toHaveStatusCode(201);

  return created.body.id;
};

/** Polls a rule until it is gone or the workflow had time to reconcile; returns the last status. */
const waitForRuleDeleted = async ({
  apiClient,
  headers,
  ruleId,
}: {
  apiClient: ApiClientFixture;
  headers: Record<string, string>;
  ruleId: string;
}): Promise<number> => {
  const deadline = Date.now() + WORKFLOW_RECONCILE_TIMEOUT_MS;
  let status = 200;
  while (status !== 404 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    ({ statusCode: status } = await apiClient.get(`${RULES_PATH}/${ruleId}`, { headers }));
  }

  return status;
};

apiTest.describe(
  'POST /internal/nightshift/detection/_reconcile',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    // Deleted after each test, so a failed one leaves no rule running or source behind.
    let ruleIds: string[] = [];
    let sourceIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiServices, config }) => {
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, true);
      }
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest.afterEach(async ({ apiClient, esClient }) => {
      const headers = { ...COMMON_HEADERS, ...cookieHeader };
      // A rule the reconciliation already deleted answers 404, which is fine.
      await Promise.all([
        ...ruleIds.map((id) => apiClient.delete(`${RULES_PATH}/${id}`, { headers })),
        ...sourceIds.map((id) => apiClient.delete(`${SOURCES_PATH}/${id}`, { headers })),
        esClient.indices.delete({ index: SOURCE_INDEX, ignore_unavailable: true }),
      ]);
      ruleIds = [];
      sourceIds = [];
    });

    apiTest.afterAll(async ({ apiServices, config }) => {
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, null);
      }
    });

    apiTest(
      'the space setup installs and turns on the reconcile workflow',
      async ({ apiClient }) => {
        const response = await apiClient.get(RECONCILE_WORKFLOW_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader, 'elastic-api-version': '2023-10-31' },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.enabled).toBe(true);
      }
    );

    // Proves the detection account can list and delete the space's managed rules. No strategy
    // wants a rule yet, so a managed rule of a strategy that no longer exists must go.
    apiTest('deletes a managed rule no strategy wants, as the account', async ({ apiClient }) => {
      const headers = { ...COMMON_HEADERS, ...cookieHeader };
      const ruleId = await createRetiredStrategyRule({ apiClient, headers });
      ruleIds.push(ruleId);

      // The route waits out a reconciliation the workflow may be running, so one call is enough.
      const reconcile = await apiClient.post<ReconcileResponse>(RECONCILE_PATH, {
        headers,
        body: {},
        responseType: 'json',
      });

      expect(reconcile).toHaveStatusCode(200);
      expect(reconcile.body).toMatchObject({ status: 'completed', failures: [] });
      expect(reconcile.body.deleted).toBeGreaterThanOrEqual(1);

      const afterwards = await apiClient.get(`${RULES_PATH}/${ruleId}`, { headers });
      expect(afterwards).toHaveStatusCode(404);
    });

    // Proves the whole path without calling the route: the source change listener starts the
    // workflow, its guard and concurrency group let the start through, and it calls the route.
    apiTest(
      'a source change reconciles the space through the workflow',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(WORKFLOW_RECONCILE_TIMEOUT_MS + 30_000);
        const headers = { ...COMMON_HEADERS, ...cookieHeader };
        await esClient.indices.create({
          index: SOURCE_INDEX,
          mappings: { properties: { '@timestamp': { type: 'date' }, message: { type: 'text' } } },
        });
        const ruleId = await createRetiredStrategyRule({ apiClient, headers });
        ruleIds.push(ruleId);

        const source = await apiClient.post(SOURCES_PATH, {
          headers,
          responseType: 'json',
          body: { title: 'Reconcile on change', esql: `FROM ${SOURCE_INDEX}` },
        });
        expect(source).toHaveStatusCode(200);
        sourceIds.push(source.body.source.id);

        expect(await waitForRuleDeleted({ apiClient, headers, ruleId })).toBe(404);
      }
    );
  }
);
