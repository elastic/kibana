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
  'Delete Composite SLOs',
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

    apiTest('deletes a composite SLO', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const deleteRes = await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(deleteRes).toHaveStatusCode(204);

      const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(404);
    });

    apiTest('returns 404 when deleting a non-existent composite SLO', async ({ apiClient }) => {
      const response = await apiClient.delete('api/observability/slo_composites/non-existent-id', {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('only deletes the targeted composite SLO', async ({ apiClient }) => {
      const first = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, name: 'First Composite' },
        responseType: 'json',
      });
      expect(first).toHaveStatusCode(200);
      const firstId = (first.body as Record<string, unknown>).id as string;

      const second = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, name: 'Second Composite' },
        responseType: 'json',
      });
      expect(second).toHaveStatusCode(200);
      const secondId = (second.body as Record<string, unknown>).id as string;

      const deleteRes = await apiClient.delete(`api/observability/slo_composites/${firstId}`, {
        headers,
        responseType: 'json',
      });
      expect(deleteRes).toHaveStatusCode(204);

      const getDeleted = await apiClient.get(`api/observability/slo_composites/${firstId}`, {
        headers,
        responseType: 'json',
      });
      expect(getDeleted).toHaveStatusCode(404);

      const getRemaining = await apiClient.get(`api/observability/slo_composites/${secondId}`, {
        headers,
        responseType: 'json',
      });
      expect(getRemaining).toHaveStatusCode(200);
      expect((getRemaining.body as Record<string, unknown>).id).toBe(secondId);
      expect((getRemaining.body as Record<string, unknown>).name).toBe('Second Composite');
    });
  }
);
