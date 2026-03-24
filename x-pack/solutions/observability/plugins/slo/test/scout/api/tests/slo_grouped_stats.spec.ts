/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTestWithoutDataForge as apiTest,
  cleanupSloSummaryDocs,
  createApmSummaryDoc,
  insertSloSummaryDocs,
} from '../fixtures';

apiTest.describe(
  'Get SLO Grouped Stats',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.afterEach(async ({ esClient }) => {
      await cleanupSloSummaryDocs(esClient);
    });

    apiTest('returns empty results when no APM SLOs exist', async ({ apiServices }) => {
      const response = await apiServices.slo.postGroupedStats({ type: 'apm' });
      expect(response).toHaveStatusCode(200);
      expect((response.body as { results: unknown[] }).results).toHaveLength(0);
    });

    apiTest(
      'returns grouped stats by service.name for APM SLOs',
      async ({ apiServices, esClient }) => {
        const now = new Date().toISOString();
        await insertSloSummaryDocs(esClient, [
          createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now),
          createApmSummaryDoc('slo-2', 'service-a', 'VIOLATED', now),
          createApmSummaryDoc('slo-3', 'service-b', 'HEALTHY', now),
          createApmSummaryDoc('slo-4', 'service-b', 'HEALTHY', now),
          createApmSummaryDoc('slo-5', 'service-b', 'DEGRADING', now),
        ]);

        const response = await apiServices.slo.postGroupedStats({ type: 'apm' });
        expect(response).toHaveStatusCode(200);
        const body = response.body as {
          results: Array<{
            entity: string;
            summary: { healthy: number; violated: number; degrading: number; noData: number };
          }>;
        };
        expect(body.results).toHaveLength(2);

        const serviceA = body.results.find((r) => r.entity === 'service-a');
        const serviceB = body.results.find((r) => r.entity === 'service-b');
        expect(serviceA).toBeDefined();
        expect(serviceA!.summary.healthy).toBe(1);
        expect(serviceA!.summary.violated).toBe(1);
        expect(serviceA!.summary.degrading).toBe(0);
        expect(serviceA!.summary.noData).toBe(0);

        expect(serviceB).toBeDefined();
        expect(serviceB!.summary.healthy).toBe(2);
        expect(serviceB!.summary.violated).toBe(0);
        expect(serviceB!.summary.degrading).toBe(1);
        expect(serviceB!.summary.noData).toBe(0);
      }
    );

    apiTest('filters by serviceNames', async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      await insertSloSummaryDocs(esClient, [
        createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now),
        createApmSummaryDoc('slo-2', 'service-b', 'HEALTHY', now),
        createApmSummaryDoc('slo-3', 'service-c', 'HEALTHY', now),
      ]);

      const response = await apiServices.slo.postGroupedStats({
        type: 'apm',
        serviceNames: ['service-a', 'service-b'],
      });
      expect(response).toHaveStatusCode(200);
      const entities = (response.body as { results: Array<{ entity: string }> }).results.map(
        (r) => r.entity
      );
      expect(entities).toContain('service-a');
      expect(entities).toContain('service-b');
      expect(entities).not.toContain('service-c');
    });

    apiTest('returns 400 for unsupported SLO type', async ({ apiServices }) => {
      const response = await apiServices.slo.postGroupedStats({ type: 'unsupported-type' });
      expect(response).toHaveStatusCode(400);
      expect((response.body as { message: string }).message).toContain(
        '"unsupported-type" does not match expected type'
      );
    });

    apiTest('returns 400 for invalid size parameter', async ({ apiServices }) => {
      const response = await apiServices.slo.postGroupedStats({ type: 'apm', size: 0 });
      expect(response).toHaveStatusCode(400);
      expect((response.body as { message: string }).message).toContain(
        'size must be equal to or greater than'
      );
    });
  }
);
