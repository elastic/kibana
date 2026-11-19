/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4, v7 } from 'uuid';
import type {
  GetHealthScanResultsResponse,
  ListHealthScanResponse,
  PostHealthScanResponse,
} from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { HEALTH_DATA_STREAM_NAME } from '../../../../common/constants';
import { apiTest, mergeSloApiHeaders, TEST_SPACE_ID } from '../fixtures';

const createTransformHealth = (isProblematic: boolean) => ({
  isProblematic,
  missing: false,
  status: isProblematic ? 'unhealthy' : 'healthy',
  state: isProblematic ? 'failed' : 'started',
});

const createHealthDocument = (scanId: string, isProblematic: boolean) => ({
  '@timestamp': new Date().toISOString(),
  scanId,
  spaceId: TEST_SPACE_ID,
  slo: { id: v4(), revision: 1, name: 'Scout health scan SLO', enabled: true },
  health: {
    isProblematic,
    rollup: createTransformHealth(isProblematic),
    summary: createTransformHealth(false),
  },
});

apiTest.describe(
  'Health Scan',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const seededScanId = v7();
    const otherScanId = v7();

    apiTest.beforeAll(async ({ requestAuth, esClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const docs = [
        createHealthDocument(seededScanId, true),
        createHealthDocument(seededScanId, false),
        createHealthDocument(otherScanId, false),
      ];
      await esClient.bulk({
        refresh: true,
        operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: HEALTH_DATA_STREAM_NAME,
        query: { terms: { scanId: [seededScanId, otherScanId] } },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    apiTest('POST _health/scans schedules a new scan when forced', async ({ apiClient }) => {
      const response = await apiClient.post<PostHealthScanResponse>(
        'internal/observability/slos/_health/scans',
        { headers, body: { force: true }, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.status).toBe('scheduled');
      expect(response.body.scanId).toBeDefined();
      expect(response.body.scheduledAt).toBeDefined();
    });

    apiTest('GET _health/scans lists the scans with their counts', async ({ apiClient }) => {
      const response = await apiClient.get<ListHealthScanResponse>(
        'internal/observability/slos/_health/scans?size=100',
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.scans).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ scanId: seededScanId, total: 2, problematic: 1 }),
        ])
      );
    });

    apiTest(
      'GET _health/scans/{scanId} returns the results of that scan only',
      async ({ apiClient }) => {
        const response = await apiClient.get<GetHealthScanResultsResponse>(
          `internal/observability/slos/_health/scans/${seededScanId}`,
          { headers, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.total).toBe(2);
        expect(response.body.results).toHaveLength(2);
        expect(response.body.results.every(({ scanId }) => scanId === seededScanId)).toBe(true);
        expect(response.body.scan.problematic).toBe(1);
      }
    );
  }
);
