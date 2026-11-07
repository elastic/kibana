/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateSLOResponse,
  FetchCompositeHistoricalSummaryResponse,
  FetchHistoricalSummaryResponse,
  GetSLOBurnRatesResponse,
  SnapshotResponse,
} from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  cleanupSloRollupDocs,
  createRollupDoc,
  DEFAULT_COMPOSITE_SLO,
  DEFAULT_SLO,
  insertSloRollupDocs,
  mergeSloApiHeaders,
  sloApiPathWithQuery,
  unwrapInspect,
  type InspectWrapped,
} from '../fixtures';

const INSTANCE_ID = 'scout-a';
const OTHER_INSTANCE_ID = 'scout-b';
const MINUTE_MS = 60 * 1000;

apiTest.describe(
  'SLO routes reading rollup data',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let sloId: string;
    let compositeId: string | undefined;

    apiTest.beforeAll(async ({ requestAuth, apiServices, esClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const createResponse = await apiServices.slo.create({
        ...DEFAULT_SLO,
        name: 'Scout rollup reads',
      });
      expect(createResponse).toHaveStatusCode(200);
      const { id }: CreateSLOResponse = createResponse.body;
      sloId = id;

      const now = Date.now();
      await insertSloRollupDocs(
        esClient,
        [
          { instanceId: INSTANCE_ID, good: 90 },
          { instanceId: OTHER_INSTANCE_ID, good: 50 },
        ].flatMap(({ instanceId, good }) =>
          [30, 40].map((minutesAgo) =>
            createRollupDoc({
              sloId,
              instanceId,
              timestamp: new Date(now - minutesAgo * MINUTE_MS).toISOString(),
              good,
              total: 100,
            })
          )
        )
      );
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await Promise.all([
        compositeId ? apiServices.compositeSlo.delete(compositeId) : undefined,
        apiServices.slo.delete(sloId),
        cleanupSloRollupDocs(esClient, [sloId]),
      ]);
    });

    apiTest('GET /{id}/_snapshot computes the instance summary', async ({ apiClient }) => {
      const response = await apiClient.get<SnapshotResponse>(
        sloApiPathWithQuery(`api/observability/slos/${sloId}/_snapshot`, {
          at: new Date().toISOString(),
          instanceId: INSTANCE_ID,
        }),
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.results).toStrictEqual([
        {
          id: sloId,
          instanceId: INSTANCE_ID,
          summary: {
            status: 'VIOLATED',
            sliValue: 0.9,
            good: 180,
            total: 200,
            errorBudget: expect.objectContaining({ initial: 0.01 }),
          },
        },
      ]);
    });

    apiTest(
      'POST _bulk_snapshot returns a summary per found SLO and a 404 error per missing SLO',
      async ({ apiClient }) => {
        const response = await apiClient.post<SnapshotResponse>(
          'api/observability/slos/_bulk_snapshot',
          {
            headers,
            body: {
              at: new Date().toISOString(),
              requests: [{ id: sloId, instanceId: INSTANCE_ID }, { id: 'unknown-slo-id' }],
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.results).toHaveLength(2);
        expect(response.body.results).toStrictEqual(
          expect.arrayContaining([
            {
              id: 'unknown-slo-id',
              instanceId: '*',
              error: { statusCode: 404, message: 'SLO [unknown-slo-id] not found' },
            },
            {
              id: sloId,
              instanceId: INSTANCE_ID,
              summary: expect.objectContaining({ good: 180, total: 200, sliValue: 0.9 }),
            },
          ])
        );
      }
    );

    apiTest('POST /{id}/_burn_rates computes the burn rate per window', async ({ apiClient }) => {
      const response = await apiClient.post<GetSLOBurnRatesResponse>(
        `internal/observability/slos/${sloId}/_burn_rates`,
        {
          headers,
          body: { instanceId: INSTANCE_ID, windows: [{ name: '1h', duration: '1h' }] },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const [burnRate] = response.body.burnRates;
      expect(response.body.burnRates).toHaveLength(1);
      expect(burnRate.name).toBe('1h');
      expect(burnRate.sli).toBeCloseTo(0.9, 5);
      expect(burnRate.burnRate).toBeCloseTo(10, 5);
    });

    apiTest(
      'POST _historical_summary returns the daily history of the instance',
      async ({ apiClient }) => {
        const response = await apiClient.post<InspectWrapped<FetchHistoricalSummaryResponse>>(
          'internal/observability/slos/_historical_summary',
          {
            headers,
            body: {
              list: [
                {
                  sloId,
                  instanceId: INSTANCE_ID,
                  timeWindow: DEFAULT_SLO.timeWindow,
                  budgetingMethod: DEFAULT_SLO.budgetingMethod,
                  objective: DEFAULT_SLO.objective,
                  groupBy: DEFAULT_SLO.groupBy,
                  revision: 1,
                },
              ],
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        const body = unwrapInspect(response.body);
        expect(body).toHaveLength(1);
        const [{ sloId: id, instanceId, data }] = body;
        expect(id).toBe(sloId);
        expect(instanceId).toBe(INSTANCE_ID);
        expect(data.length).toBeGreaterThan(0);
        expect(data[data.length - 1].sliValue).toBeCloseTo(0.9, 5);
      }
    );

    apiTest(
      'POST slo_composites/_historical_summary returns the weighted history of the members',
      async ({ apiClient, apiServices }) => {
        const createResponse = await apiServices.compositeSlo.create({
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId, instanceId: INSTANCE_ID, weight: 1 },
            { sloId, instanceId: OTHER_INSTANCE_ID, weight: 3 },
          ],
        });
        expect(createResponse).toHaveStatusCode(200);
        const { id }: { id: string } = createResponse.body;
        compositeId = id;

        const response = await apiClient.post<
          InspectWrapped<FetchCompositeHistoricalSummaryResponse>
        >('internal/observability/slo_composites/_historical_summary', {
          headers,
          body: { list: [compositeId] },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const body = unwrapInspect(response.body);
        expect(body).toHaveLength(1);
        const [{ compositeId: returnedId, data }] = body;
        expect(returnedId).toBe(compositeId);
        expect(data.length).toBeGreaterThan(0);
        // (1 × 0.9 + 3 × 0.5) / 4
        expect(data[data.length - 1].sliValue).toBeCloseTo(0.6, 5);
      }
    );
  }
);
