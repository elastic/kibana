/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { BulkPurgeRollupResponse, CreateSLOResponse } from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  cleanupSloRollupDocs,
  cleanupSloSummaryDocs,
  countSloRollupDocs,
  countSloSummaryDocs,
  createDummySummaryDoc,
  createRollupDoc,
  DEFAULT_SLO,
  insertSloRollupDocs,
  insertSloSummaryDocs,
  mergeSloApiHeaders,
  pollUntilTrue,
} from '../fixtures';

const DAY_MS = 24 * 60 * 60 * 1000;

const instanceFilter = (
  sloId: string,
  instanceId: string,
  ...extraFilters: QueryDslQueryContainer[]
): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { 'slo.id': sloId } },
      { term: { 'slo.instanceId': instanceId } },
      ...extraFilters,
    ],
  },
});

apiTest.describe(
  'SLO routes deleting rollup data',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const sloIdsToCleanup: string[] = [];
    const createdSloIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await Promise.all([
        ...createdSloIds.map((id) => apiServices.slo.delete(id)),
        cleanupSloRollupDocs(esClient, sloIdsToCleanup),
        cleanupSloSummaryDocs(esClient, { terms: { 'slo.id': sloIdsToCleanup } }),
      ]);
    });

    apiTest(
      'POST _delete_instances deletes the rollup and summary data of the listed instances only',
      async ({ apiClient, esClient }) => {
        const sloId = v4();
        sloIdsToCleanup.push(sloId);
        const now = new Date().toISOString();
        await Promise.all([
          insertSloRollupDocs(esClient, [
            createRollupDoc({ sloId, instanceId: 'a', timestamp: now, good: 1, total: 1 }),
            createRollupDoc({ sloId, instanceId: 'b', timestamp: now, good: 1, total: 1 }),
          ]),
          insertSloSummaryDocs(esClient, [
            createDummySummaryDoc(sloId, 'a', now),
            createDummySummaryDoc(sloId, 'b', now),
          ]),
        ]);

        const response = await apiClient.post('api/observability/slos/_delete_instances', {
          headers,
          body: { list: [{ sloId, instanceId: 'a' }] },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(204);

        await pollUntilTrue(
          async () => {
            const counts = await Promise.all([
              countSloRollupDocs(esClient, instanceFilter(sloId, 'a')),
              countSloSummaryDocs(esClient, instanceFilter(sloId, 'a')),
            ]);
            return counts.every((count) => count === 0);
          },
          { timeoutMs: 30_000, label: 'instance a data was not deleted' }
        );
        expect(
          await Promise.all([
            countSloRollupDocs(esClient, instanceFilter(sloId, 'b')),
            countSloSummaryDocs(esClient, instanceFilter(sloId, 'b')),
          ])
        ).toStrictEqual([1, 1]);
      }
    );

    apiTest(
      'POST _bulk_purge_rollup deletes the rollup data older than the purge policy',
      async ({ apiClient, apiServices, esClient }) => {
        const createResponse = await apiServices.slo.create(DEFAULT_SLO);
        expect(createResponse).toHaveStatusCode(200);
        const { id: sloId }: CreateSLOResponse = createResponse.body;
        sloIdsToCleanup.push(sloId);
        createdSloIds.push(sloId);

        const recentTimestamp = new Date(Date.now() - DAY_MS / 24).toISOString();
        await insertSloRollupDocs(esClient, [
          createRollupDoc({
            sloId,
            instanceId: 'scout-purge',
            timestamp: new Date(Date.now() - 10 * DAY_MS).toISOString(),
            good: 1,
            total: 1,
          }),
          createRollupDoc({
            sloId,
            instanceId: 'scout-purge',
            timestamp: recentTimestamp,
            good: 1,
            total: 1,
          }),
        ]);

        const response = await apiClient.post<BulkPurgeRollupResponse>(
          'api/observability/slos/_bulk_purge_rollup',
          {
            headers,
            body: { list: [sloId], purgePolicy: { purgeType: 'fixed_age', age: '7d' } },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(200);
        expect(response.body.taskId).toBeDefined();

        await pollUntilTrue(
          async () =>
            (await countSloRollupDocs(esClient, instanceFilter(sloId, 'scout-purge'))) === 1,
          { timeoutMs: 30_000, label: 'rollup data older than 7d was not purged' }
        );
        expect(
          await countSloRollupDocs(
            esClient,
            instanceFilter(sloId, 'scout-purge', { term: { '@timestamp': recentTimestamp } })
          )
        ).toBe(1);
      }
    );
  }
);
