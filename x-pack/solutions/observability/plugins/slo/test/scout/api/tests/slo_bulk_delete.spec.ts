/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_SLO, mergeSloApiHeaders, pollUntilTrue } from '../fixtures';

apiTest.describe(
  'Bulk Delete SLO',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('successfully processes the list of SLOs', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slos', {
        headers,
        body: DEFAULT_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const sloId = createRes.body.id as string;

      const response = await apiClient.post('api/observability/slos/_bulk_delete', {
        headers,
        body: { list: [sloId, 'inexistant-slo'] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const bulkBody = response.body as { taskId?: string };
      expect(bulkBody.taskId).toBeDefined();
      const taskId = bulkBody.taskId as string;

      await pollUntilTrue(
        async () => {
          const status = await apiClient.get(`api/observability/slos/_bulk_delete/${taskId}`, {
            headers,
            responseType: 'json',
          });
          return status.statusCode === 200 && status.body.isDone === true;
        },
        { timeoutMs: 120_000, intervalMs: 2000, label: 'bulk delete task completion' }
      );

      const status = await apiClient.get(`api/observability/slos/_bulk_delete/${taskId}`, {
        headers,
        responseType: 'json',
      });
      expect(status.body).toStrictEqual({
        isDone: true,
        results: [
          { id: sloId, success: true },
          { id: 'inexistant-slo', success: false, error: `SLO [inexistant-slo] not found` },
        ],
      });
    });

    apiTest('returns task not found', async ({ apiClient }) => {
      const status = await apiClient.get('api/observability/slos/_bulk_delete/inexistant', {
        headers,
        responseType: 'json',
      });
      expect(status).toHaveStatusCode(200);
      expect(status.body).toStrictEqual({ isDone: true, error: 'Task not found' });
    });
  }
);
