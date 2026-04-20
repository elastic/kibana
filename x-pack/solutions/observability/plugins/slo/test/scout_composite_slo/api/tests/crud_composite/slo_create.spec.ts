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
  'Create Composite SLOs',
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

    apiTest('creates a composite SLO with required fields', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      expect(body.id).toBeDefined();
      expect(body.name).toBe(DEFAULT_COMPOSITE_SLO.name);
      expect(body.description).toBe(DEFAULT_COMPOSITE_SLO.description);
      expect(body.compositeMethod).toBe('weightedAverage');
      expect(body.budgetingMethod).toBe('occurrences');
      expect(body.objective).toStrictEqual({ target: 0.99 });
      expect((body.timeWindow as Record<string, unknown>).type).toBe('rolling');
      expect(body.members).toHaveLength(3);
      expect(body.tags).toStrictEqual(['composite-test']);
      expect(body.enabled).toBe(true);
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
      expect(body.createdBy).toBeDefined();
      expect(body.updatedBy).toBeDefined();
      expect(body.version).toBeDefined();
    });

    apiTest('creates a composite SLO with a custom id', async ({ apiClient }) => {
      const customId = 'my-custom-composite-id';
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, id: customId },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect((response.body as Record<string, unknown>).id).toBe(customId);
    });

    apiTest('creates a composite SLO with enabled=false', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, enabled: false },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      expect(body.id).toBeDefined();
      expect(body.enabled).toBe(false);
    });

    apiTest('creates a composite SLO with empty tags', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, tags: [] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect((response.body as Record<string, unknown>).tags).toStrictEqual([]);
    });

    apiTest('returns 400 when fewer than 2 members are provided', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [{ sloId: 'single-slo', weight: 1 }],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when a member has a non-positive weight', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-1', weight: 0 },
            { sloId: 'slo-2', weight: 1 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when a member has a non-integer weight', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-1', weight: 1.5 },
            { sloId: 'slo-2', weight: 1 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });
  }
);
