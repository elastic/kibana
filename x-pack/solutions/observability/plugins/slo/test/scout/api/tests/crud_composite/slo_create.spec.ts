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

    apiTest('creates a composite SLO and applies defaults', async ({ apiClient }) => {
      const beforeCreate = Date.now();
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      expect(body).toMatchObject({
        name: DEFAULT_COMPOSITE_SLO.name,
        description: DEFAULT_COMPOSITE_SLO.description,
        compositeMethod: 'weightedAverage',
        budgetingMethod: 'occurrences',
        objective: { target: 0.99 },
        timeWindow: { duration: '7d', type: 'rolling' },
        members: DEFAULT_COMPOSITE_SLO.members,
        tags: ['composite-test'],
        enabled: true,
        version: 1,
      });
      expect(typeof body.id).toBe('string');
      expect((body.id as string).length).toBeGreaterThan(0);
      expect(body.createdBy).toBeDefined();
      expect(body.updatedBy).toBe(body.createdBy);
      expect(body.createdAt).toBe(body.updatedAt);
      expect(new Date(body.createdAt as string).getTime()).toBeGreaterThan(beforeCreate - 5000);
    });

    apiTest(
      'persists a custom id, enabled=false and member instanceIds in order',
      async ({ apiClient }) => {
        const members = [
          { sloId: 'grouped-slo-1', weight: 3, instanceId: 'host-a' },
          { sloId: 'grouped-slo-1', weight: 2, instanceId: 'host-b' },
          { sloId: 'ungrouped-slo', weight: 1 },
        ];
        const response = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            id: 'my-custom-composite-id',
            enabled: false,
            members,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const body = response.body as Record<string, unknown>;
        expect(body.id).toBe('my-custom-composite-id');
        expect(body.enabled).toBe(false);
        expect(body.members).toStrictEqual(members);
      }
    );

    apiTest('returns 409 when creating with a duplicate id', async ({ apiClient }) => {
      const duplicateId = 'duplicate-composite-id';
      const first = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, id: duplicateId, name: 'First' },
        responseType: 'json',
      });
      expect(first).toHaveStatusCode(200);

      const second = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, id: duplicateId, name: 'Duplicate' },
        responseType: 'json',
      });
      expect(second).toHaveStatusCode(409);
    });

    apiTest('returns 400 when the body fails schema validation', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [{ sloId: 'single-member-slo', weight: 1 }],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });
  }
);
