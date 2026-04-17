/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_COMPOSITE_SLO, mergeSloApiHeaders } from '../../fixtures';

/**
 * Tests for the composite SLO GET endpoint which triggers the compute engine.
 * The GET /api/observability/slo_composites/{id} endpoint:
 * - Loads the composite definition and member SLO definitions
 * - Computes weighted average SLI across members
 * - Computes normalised weights and per-member contributions
 * - Derives burn rates for 5m, 1h, 1d windows
 * - Returns NO_DATA when member SLOs are not found
 */
apiTest.describe(
  'Composite SLO Compute Engine - GET Summary',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterEach(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest(
      'returns NO_DATA summary when all member SLOs are nonexistent',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            members: [
              { sloId: 'phantom-slo-1', weight: 1 },
              { sloId: 'phantom-slo-2', weight: 2 },
            ],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        const summary = body.summary as {
          sliValue: number;
          status: string;
          fiveMinuteBurnRate: number;
          oneHourBurnRate: number;
          oneDayBurnRate: number;
          errorBudget: Record<string, unknown>;
        };

        expect(summary.status).toBe('NO_DATA');
        expect(summary.sliValue).toBe(-1);
        expect(summary.fiveMinuteBurnRate).toBe(0);
        expect(summary.oneHourBurnRate).toBe(0);
        expect(summary.oneDayBurnRate).toBe(0);
      }
    );

    apiTest(
      'returns correct summary shape for a 2-member composite with equal weights',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Equal Weight Pair',
            members: [
              { sloId: 'eq-member-1', weight: 1 },
              { sloId: 'eq-member-2', weight: 1 },
            ],
            objective: { target: 0.99 },
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        expect(body.summary).toBeDefined();
        expect(body.members).toBeDefined();

        const summary = body.summary as Record<string, unknown>;
        expect(typeof summary.sliValue).toBe('number');
        expect(typeof summary.status).toBe('string');
        expect(typeof summary.fiveMinuteBurnRate).toBe('number');
        expect(typeof summary.oneHourBurnRate).toBe('number');
        expect(typeof summary.oneDayBurnRate).toBe('number');

        const errorBudget = summary.errorBudget as Record<string, unknown>;
        expect(errorBudget).toBeDefined();
        expect(typeof errorBudget.initial).toBe('number');
        expect(typeof errorBudget.consumed).toBe('number');
        expect(typeof errorBudget.remaining).toBe('number');
        expect(typeof errorBudget.isEstimated).toBe('boolean');
      }
    );

    apiTest(
      'returns correct summary shape for a composite with varying weights',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Varying Weights',
            members: [
              { sloId: 'vw-critical', weight: 10 },
              { sloId: 'vw-important', weight: 5 },
              { sloId: 'vw-minor', weight: 1 },
            ],
            objective: { target: 0.995 },
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        expect(body.name).toBe('Varying Weights');
        expect(body.objective).toStrictEqual({ target: 0.995 });
        expect(body.summary).toBeDefined();
      }
    );

    apiTest(
      'returns correct summary shape for a composite with 5 members',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Five Members',
            members: [
              { sloId: 'five-member-a', weight: 1 },
              { sloId: 'five-member-b', weight: 2 },
              { sloId: 'five-member-c', weight: 3 },
              { sloId: 'five-member-d', weight: 4 },
              { sloId: 'five-member-e', weight: 5 },
            ],
            objective: { target: 0.99 },
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        const summary = body.summary as Record<string, unknown>;
        expect(summary).toBeDefined();
        expect(['NO_DATA', 'HEALTHY', 'DEGRADING', 'VIOLATED']).toContain(summary.status);
      }
    );

    apiTest(
      'returns correct summary shape for a composite with 25 members (max)',
      async ({ apiClient }) => {
        const maxMembers = Array.from({ length: 25 }, (_, i) => ({
          sloId: `max-summary-member-${i}`,
          weight: (i % 5) + 1,
        }));

        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Max Members Summary',
            members: maxMembers,
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        const summary = body.summary as Record<string, unknown>;
        expect(summary).toBeDefined();
        expect(summary.sliValue).toBeDefined();
        expect(summary.errorBudget).toBeDefined();
        expect(summary.status).toBeDefined();
      }
    );

    apiTest(
      'returns correct summary for a composite with members having instanceId',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Grouped Members Summary',
            members: [
              { sloId: 'grouped-slo-a', weight: 3, instanceId: 'us-east-1' },
              { sloId: 'grouped-slo-a', weight: 3, instanceId: 'eu-west-1' },
              { sloId: 'grouped-slo-b', weight: 2 },
            ],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        expect(body.summary).toBeDefined();
        expect(body.members).toBeDefined();
      }
    );

    apiTest(
      'returns the same status across consecutive GETs (idempotent)',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            members: [
              { sloId: 'idempotent-1', weight: 1 },
              { sloId: 'idempotent-2', weight: 1 },
            ],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const get1 = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        const get2 = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });

        const summary1 = (get1.body as Record<string, unknown>).summary as Record<string, unknown>;
        const summary2 = (get2.body as Record<string, unknown>).summary as Record<string, unknown>;

        expect(summary1.status).toBe(summary2.status);
        expect(summary1.sliValue).toBe(summary2.sliValue);
      }
    );

    apiTest('NO_DATA burn rates are all zero', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'burnrate-phantom-1', weight: 5 },
            { sloId: 'burnrate-phantom-2', weight: 10 },
          ],
        },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(200);

      const summary = (getRes.body as Record<string, unknown>).summary as Record<string, unknown>;
      expect(summary.fiveMinuteBurnRate).toBe(0);
      expect(summary.oneHourBurnRate).toBe(0);
      expect(summary.oneDayBurnRate).toBe(0);
    });

    apiTest('NO_DATA errorBudget has initial=0 and consumed=0', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'budget-phantom-1', weight: 1 },
            { sloId: 'budget-phantom-2', weight: 1 },
          ],
        },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(200);

      const summary = (getRes.body as Record<string, unknown>).summary as Record<string, unknown>;
      const errorBudget = summary.errorBudget as {
        initial: number;
        consumed: number;
        remaining: number;
        isEstimated: boolean;
      };
      expect(errorBudget.initial).toBe(0);
      expect(errorBudget.consumed).toBe(0);
    });

    apiTest(
      'returns definition fields alongside summary in the GET response',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Definition Fields Check',
            description: 'Verifying all fields returned',
            tags: ['field-check'],
            objective: { target: 0.975 },
            timeWindow: { duration: '30d', type: 'rolling' as const },
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);

        const body = getRes.body as Record<string, unknown>;
        expect(body.id).toBe(createdId);
        expect(body.name).toBe('Definition Fields Check');
        expect(body.description).toBe('Verifying all fields returned');
        expect(body.compositeMethod).toBe('weightedAverage');
        expect(body.budgetingMethod).toBe('occurrences');
        expect(body.objective).toStrictEqual({ target: 0.975 });
        expect(body.tags).toStrictEqual(['field-check']);
        expect(body.enabled).toBe(true);
        expect(body.version).toBe(1);

        const tw = body.timeWindow as Record<string, unknown>;
        expect(tw.duration).toBe('30d');
        expect(tw.type).toBe('rolling');

        expect(body.summary).toBeDefined();
        expect(body.members).toBeDefined();
        expect(body.createdAt).toBeDefined();
        expect(body.updatedAt).toBeDefined();
        expect(body.createdBy).toBeDefined();
        expect(body.updatedBy).toBeDefined();
      }
    );
  }
);
