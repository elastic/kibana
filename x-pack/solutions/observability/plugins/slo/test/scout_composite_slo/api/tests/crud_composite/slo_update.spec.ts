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
  'Update Composite SLOs',
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

    apiTest('updates the name of a composite SLO', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { name: 'Updated Composite Name' },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const body = updateRes.body as Record<string, unknown>;
      expect(body.id).toBe(createdId);
      expect(body.name).toBe('Updated Composite Name');
      expect(body.description).toBe(DEFAULT_COMPOSITE_SLO.description);
      expect(body.members).toHaveLength(3);
    });

    apiTest('updates the members of a composite SLO', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const newMembers = [
        { sloId: 'new-member-1', weight: 5 },
        { sloId: 'new-member-2', weight: 10 },
      ];

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { members: newMembers },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const body = updateRes.body as Record<string, unknown>;
      expect(body.id).toBe(createdId);
      const members = body.members as Array<{ sloId: string; weight: number }>;
      expect(members).toHaveLength(2);
      expect(members[0].sloId).toBe('new-member-1');
      expect(members[0].weight).toBe(5);
      expect(members[1].sloId).toBe('new-member-2');
      expect(members[1].weight).toBe(10);
    });

    apiTest('updates tags and objective', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { tags: ['new-tag'], objective: { target: 0.95 } },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const body = updateRes.body as Record<string, unknown>;
      expect(body.tags).toStrictEqual(['new-tag']);
      expect(body.objective).toStrictEqual({ target: 0.95 });
    });

    apiTest('updates the enabled flag', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;
      expect((createRes.body as Record<string, unknown>).enabled).toBe(true);

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { enabled: false },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);
      expect((updateRes.body as Record<string, unknown>).enabled).toBe(false);
    });

    apiTest('returns 404 when updating a non-existent composite SLO', async ({ apiClient }) => {
      const response = await apiClient.put('api/observability/slo_composites/non-existent-id', {
        headers,
        body: { name: 'Does not matter' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 400 when updating members to fewer than 2', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const response = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { members: [{ sloId: 'only-one', weight: 1 }] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });
  }
);
