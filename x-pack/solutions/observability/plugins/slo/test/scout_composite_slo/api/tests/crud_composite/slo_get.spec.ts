/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_COMPOSITE_SLO, mergeSloApiHeaders } from '../../fixtures';

apiTest.describe(
  'Get Composite SLO',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest('retrieves a composite SLO by id', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
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
      expect(body.name).toBe(DEFAULT_COMPOSITE_SLO.name);
      expect(body.description).toBe(DEFAULT_COMPOSITE_SLO.description);
      expect(body.compositeMethod).toBe('weightedAverage');
      expect(body.members).toBeDefined();
      expect(body.objective).toStrictEqual({ target: 0.99 });
      expect((body.timeWindow as Record<string, unknown>).type).toBe('rolling');
      expect(body.tags).toStrictEqual(['composite-test']);
      expect(body.enabled).toBe(true);
    });

    apiTest('returns 404 for a non-existent composite SLO', async ({ apiClient }) => {
      const response = await apiClient.get('api/observability/slo_composites/non-existent-id', {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest(
      'returns the composite SLO summary structure with sliValue, errorBudget, status, and burn rates',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: DEFAULT_COMPOSITE_SLO,
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
        expect(summary.fiveMinuteBurnRate).toBeDefined();
        expect(summary.oneHourBurnRate).toBeDefined();
        expect(summary.oneDayBurnRate).toBeDefined();
        expect(typeof summary.sliValue).toBe('number');
        expect(typeof summary.fiveMinuteBurnRate).toBe('number');
        expect(typeof summary.oneHourBurnRate).toBe('number');
        expect(typeof summary.oneDayBurnRate).toBe('number');
      }
    );

    apiTest('returns NO_DATA status when member SLOs do not exist', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'nonexistent-slo-1', weight: 1 },
            { sloId: 'nonexistent-slo-2', weight: 2 },
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
      const summary = body.summary as Record<string, unknown>;
      expect(summary.status).toBe('NO_DATA');
      expect(summary.sliValue).toBe(-1);
      expect(summary.fiveMinuteBurnRate).toBe(0);
      expect(summary.oneHourBurnRate).toBe(0);
      expect(summary.oneDayBurnRate).toBe(0);
    });

    apiTest(
      'returns errorBudget structure with initial, consumed, remaining, and isEstimated fields',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: DEFAULT_COMPOSITE_SLO,
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
        const errorBudget = summary.errorBudget as Record<string, unknown>;
        expect(errorBudget).toBeDefined();
        expect(errorBudget.initial).toBeDefined();
        expect(errorBudget.consumed).toBeDefined();
        expect(errorBudget.remaining).toBeDefined();
        expect(errorBudget.isEstimated).toBeDefined();
      }
    );

    apiTest(
      'returns members array as member summaries when retrieving by id',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: DEFAULT_COMPOSITE_SLO,
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
        const members = body.members as Array<Record<string, unknown>>;
        expect(Array.isArray(members)).toBe(true);
      }
    );

    apiTest('returns all definition fields in the get response', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Full Fields Composite',
          description: 'A detailed description for verification',
          tags: ['tagA', 'tagB'],
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
      expect(body.name).toBe('Full Fields Composite');
      expect(body.description).toBe('A detailed description for verification');
      expect(body.compositeMethod).toBe('weightedAverage');
      expect(body.budgetingMethod).toBe('occurrences');
      expect(body.objective).toStrictEqual({ target: 0.99 });
      expect(body.tags).toStrictEqual(['tagA', 'tagB']);
      expect(body.enabled).toBe(true);
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
      expect(body.createdBy).toBeDefined();
      expect(body.updatedBy).toBeDefined();
      expect(body.version).toBe(1);

      const tw = body.timeWindow as Record<string, unknown>;
      expect(tw.duration).toBe('7d');
      expect(tw.type).toBe('rolling');
    });

    apiTest('returns the same data after create and subsequent get', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Round-Trip Composite',
          tags: ['round-trip'],
        },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const created = createRes.body as Record<string, unknown>;

      const getRes = await apiClient.get(
        `api/observability/slo_composites/${created.id as string}`,
        { headers, responseType: 'json' }
      );
      expect(getRes).toHaveStatusCode(200);
      const retrieved = getRes.body as Record<string, unknown>;

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.name).toBe(created.name);
      expect(retrieved.description).toBe(created.description);
      expect(retrieved.compositeMethod).toBe(created.compositeMethod);
      expect(retrieved.budgetingMethod).toBe(created.budgetingMethod);
      expect(retrieved.objective).toStrictEqual(created.objective);
      expect(retrieved.tags).toStrictEqual(created.tags);
      expect(retrieved.enabled).toBe(created.enabled);
    });
  }
);
