/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_SLO, pollUntilTrue, type SloScoutApi } from '../fixtures';

apiTest.describe(
  'Bulk Delete SLO',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let sloApi: SloScoutApi;

    apiTest.beforeAll(async ({ apiServices, sloFtrDataForgeSuite }) => {
      await sloFtrDataForgeSuite.setup();
      sloApi = apiServices.slo;
    });

    apiTest.afterAll(async ({ sloFtrDataForgeSuite }) => {
      await sloFtrDataForgeSuite.teardown();
    });

    apiTest('successfully processes the list of SLOs', async () => {
      const createRes = await sloApi.create(DEFAULT_SLO);
      expect(createRes).toHaveStatusCode(200);
      const sloId = createRes.body.id as string;

      const response = await sloApi.bulkDelete({ list: [sloId, 'inexistant-slo'] });
      expect(response).toHaveStatusCode(200);
      const bulkBody = response.body as { taskId?: string };
      expect(bulkBody.taskId).toBeDefined();
      const taskId = bulkBody.taskId as string;

      await pollUntilTrue(
        async () => {
          const status = await sloApi.bulkDeleteStatus(taskId);
          return status.statusCode === 200 && status.body.isDone === true;
        },
        { timeoutMs: 120_000, intervalMs: 2000, label: 'bulk delete task completion' }
      );

      const status = await sloApi.bulkDeleteStatus(taskId);
      expect(status.body).toStrictEqual({
        isDone: true,
        results: [
          { id: sloId, success: true },
          { id: 'inexistant-slo', success: false, error: `SLO [inexistant-slo] not found` },
        ],
      });
    });

    apiTest('returns task not found', async () => {
      const status = await sloApi.bulkDeleteStatus('inexistant');
      expect(status).toHaveStatusCode(200);
      expect(status.body).toStrictEqual({ isDone: true, error: 'Task not found' });
    });
  }
);
