/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  cleanupSloSummaryDocs,
  countSloSummaryDocs,
  insertSloSummaryDocs,
  mergeSloApiHeaders,
  pollUntilTrue,
  refreshSloSummaryIndex,
  TEST_SPACE_ID,
  createDummySummaryDoc,
} from '../fixtures';

apiTest.describe(
  'Purge Instances',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupSloSummaryDocs(esClient);
    });

    apiTest('purges all stale instances without list filter', async ({ apiClient, esClient }) => {
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const docs = [
        createDummySummaryDoc('slo-1', 'instance-1', oldDate),
        createDummySummaryDoc('slo-1', 'instance-2', oldDate),
        createDummySummaryDoc('slo-2', 'instance-1', oldDate),
      ];

      await insertSloSummaryDocs(esClient, docs);
      const countBefore = await countSloSummaryDocs(esClient, {
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countBefore).toBe(3);

      const response = await apiClient.post('api/observability/slos/_purge_instances', {
        headers,
        body: { staleDuration: '30d' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const taskBody = response.body as { taskId?: string };
      expect(taskBody.taskId).toBeDefined();

      await pollUntilTrue(
        async () => {
          const status = await apiClient.get(
            `api/observability/slos/_purge_instances/${taskBody.taskId as string}`,
            { headers, responseType: 'json' }
          );
          return (
            status.statusCode === 200 && (status.body as { completed?: boolean }).completed === true
          );
        },
        { timeoutMs: 120_000, intervalMs: 2000 }
      );

      const status = await apiClient.get(
        `api/observability/slos/_purge_instances/${taskBody.taskId as string}`,
        { headers, responseType: 'json' }
      );
      const st = status.body as { completed: boolean; status: { deleted: number } };
      expect(st.completed).toBe(true);
      expect(st.status.deleted).toBe(3);

      await refreshSloSummaryIndex(esClient);
      const countAfter = await countSloSummaryDocs(esClient, {
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countAfter).toBe(0);
    });

    apiTest(
      'purges only specific SLO instances when list is provided',
      async ({ apiClient, esClient }) => {
        const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const docs = [
          createDummySummaryDoc('slo-to-purge-1', 'instance-1', oldDate),
          createDummySummaryDoc('slo-to-purge-1', 'instance-2', oldDate),
          createDummySummaryDoc('slo-to-keep', 'instance-1', oldDate),
          createDummySummaryDoc('slo-to-keep', 'instance-2', oldDate),
        ];

        await insertSloSummaryDocs(esClient, docs);

        const countBefore = await countSloSummaryDocs(esClient, {
          bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
        });
        expect(countBefore).toBe(4);

        const response = await apiClient.post('api/observability/slos/_purge_instances', {
          headers,
          body: {
            list: ['slo-to-purge-1'],
            staleDuration: '30d',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const taskBody = response.body as { taskId: string };

        await pollUntilTrue(
          async () => {
            const status = await apiClient.get(
              `api/observability/slos/_purge_instances/${taskBody.taskId}`,
              { headers, responseType: 'json' }
            );
            return (
              status.statusCode === 200 &&
              (status.body as { completed?: boolean }).completed === true
            );
          },
          { timeoutMs: 120_000, intervalMs: 2000 }
        );

        await refreshSloSummaryIndex(esClient);
        const countAfter = await countSloSummaryDocs(esClient, {
          bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
        });
        expect(countAfter).toBe(2);

        const keepCount = await countSloSummaryDocs(esClient, {
          bool: {
            must: [{ term: { spaceId: TEST_SPACE_ID } }, { term: { 'slo.id': 'slo-to-keep' } }],
          },
        });
        expect(keepCount).toBe(2);
      }
    );

    apiTest(
      'respects staleDuration parameter and only deletes old documents',
      async ({ apiClient, esClient }) => {
        const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        const docs = [
          createDummySummaryDoc('slo-1', 'instance-old', oldDate),
          createDummySummaryDoc('slo-1', 'instance-recent', recentDate),
        ];

        await insertSloSummaryDocs(esClient, docs);

        const countBefore = await countSloSummaryDocs(esClient, {
          bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
        });
        expect(countBefore).toBe(2);

        const response = await apiClient.post('api/observability/slos/_purge_instances', {
          headers,
          body: { staleDuration: '30d' },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const taskBody = response.body as { taskId: string };

        await pollUntilTrue(
          async () => {
            const status = await apiClient.get(
              `api/observability/slos/_purge_instances/${taskBody.taskId}`,
              { headers, responseType: 'json' }
            );
            return (
              status.statusCode === 200 &&
              (status.body as { completed?: boolean }).completed === true
            );
          },
          { timeoutMs: 120_000, intervalMs: 2000 }
        );

        await refreshSloSummaryIndex(esClient);
        const countAfter = await countSloSummaryDocs(esClient, {
          bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
        });
        expect(countAfter).toBe(1);

        const recentCount = await countSloSummaryDocs(esClient, {
          bool: {
            must: [
              { term: { spaceId: TEST_SPACE_ID } },
              { term: { 'slo.instanceId': 'instance-recent' } },
            ],
          },
        });
        expect(recentCount).toBe(1);
      }
    );

    apiTest(
      'allows force parameter to override staleDuration validation',
      async ({ apiClient, esClient }) => {
        const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
        const docs = [createDummySummaryDoc('slo-1', 'instance-1', oldDate)];

        await insertSloSummaryDocs(esClient, docs);

        const countBefore = await countSloSummaryDocs(esClient, {
          bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
        });
        expect(countBefore).toBe(1);

        const response = await apiClient.post('api/observability/slos/_purge_instances', {
          headers,
          body: { staleDuration: '5d', force: true },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const taskBody = response.body as { taskId: string };

        await pollUntilTrue(
          async () => {
            const status = await apiClient.get(
              `api/observability/slos/_purge_instances/${taskBody.taskId}`,
              { headers, responseType: 'json' }
            );
            return (
              status.statusCode === 200 &&
              (status.body as { completed?: boolean }).completed === true
            );
          },
          { timeoutMs: 120_000, intervalMs: 2000 }
        );

        await refreshSloSummaryIndex(esClient);
        const countAfter = await countSloSummaryDocs(esClient, {
          bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
        });
        expect(countAfter).toBe(0);
      }
    );

    apiTest('returns task not found error for invalid taskId', async ({ apiClient }) => {
      const status = await apiClient.get(
        'api/observability/slos/_purge_instances/inexistant-task-id',
        { headers, responseType: 'json' }
      );
      expect(status).toHaveStatusCode(200);
      const body = status.body as { completed: boolean; error?: string };
      expect(body.completed).toBe(false);
      expect(body.error).toBe('Task not found');
    });
  }
);
