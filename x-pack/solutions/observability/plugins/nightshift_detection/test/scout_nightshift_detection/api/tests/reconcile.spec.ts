/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, COMMON_HEADERS, RECONCILE_PATH, setNightshiftEnabled } from '../fixtures';

const RULES_PATH = 'api/alerting/v2/rules';
const RECONCILE_WORKFLOW_PATH =
  'api/workflows/workflow/system-nightshift-detection-reconcile-default';

interface ReconcileResponse {
  status: 'completed' | 'busy';
  deleted?: number;
  failures?: unknown[];
}

apiTest.describe(
  'POST /internal/nightshift/detection/_reconcile',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, apiServices, config }) => {
      if (!config.isCloud) {
        await setNightshiftEnabled(apiServices, true);
      }
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
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
      const ruleId: string = created.body.id;

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
  }
);
