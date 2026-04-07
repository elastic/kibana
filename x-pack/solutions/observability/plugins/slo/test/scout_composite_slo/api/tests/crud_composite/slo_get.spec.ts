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
      expect(body.members).toHaveLength(3);
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
  }
);
