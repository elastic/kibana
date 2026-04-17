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

    apiTest('updates the description of a composite SLO', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { description: 'A brand new description for the composite SLO' },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const body = updateRes.body as Record<string, unknown>;
      expect(body.description).toBe('A brand new description for the composite SLO');
      expect(body.name).toBe(DEFAULT_COMPOSITE_SLO.name);
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

    apiTest('updates the time window', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { timeWindow: { duration: '30d', type: 'rolling' } },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const tw = (updateRes.body as Record<string, unknown>).timeWindow as Record<string, unknown>;
      const duration = tw.duration as Record<string, unknown>;
      expect(duration.value).toBe(30);
      expect(duration.unit).toBe('d');
      expect(tw.type).toBe('rolling');
    });

    apiTest('updates multiple fields simultaneously', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: {
          name: 'Multi-Update Composite',
          description: 'Updated via multi-field update',
          tags: ['updated-tag-a', 'updated-tag-b'],
          objective: { target: 0.95 },
          members: [
            { sloId: 'multi-slo-1', weight: 10 },
            { sloId: 'multi-slo-2', weight: 20 },
            { sloId: 'multi-slo-3', weight: 30 },
            { sloId: 'multi-slo-4', weight: 40 },
          ],
          enabled: false,
          timeWindow: { duration: '30d', type: 'rolling' as const },
        },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const body = updateRes.body as Record<string, unknown>;
      expect(body.name).toBe('Multi-Update Composite');
      expect(body.description).toBe('Updated via multi-field update');
      expect(body.tags).toStrictEqual(['updated-tag-a', 'updated-tag-b']);
      expect(body.objective).toStrictEqual({ target: 0.95 });
      expect(body.enabled).toBe(false);
      expect(body.members as unknown[]).toHaveLength(4);
      const tw = body.timeWindow as Record<string, unknown>;
      const dur = tw.duration as Record<string, unknown>;
      expect(dur.value).toBe(30);
      expect(dur.unit).toBe('d');
    });

    apiTest('updates updatedAt timestamp after modification', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;
      const originalUpdatedAt = (createRes.body as Record<string, unknown>).updatedAt as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { name: 'Timestamp Check' },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);
      const newUpdatedAt = (updateRes.body as Record<string, unknown>).updatedAt as string;

      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    apiTest('preserves createdAt after update', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;
      const originalCreatedAt = (createRes.body as Record<string, unknown>).createdAt as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { name: 'CreatedAt Preservation Check' },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);
      expect((updateRes.body as Record<string, unknown>).createdAt).toBe(originalCreatedAt);
    });

    apiTest('update to members with instanceId', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: {
          members: [
            { sloId: 'grouped-a', weight: 2, instanceId: 'instance-x' },
            { sloId: 'grouped-b', weight: 3, instanceId: 'instance-y' },
          ],
        },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);

      const members = (updateRes.body as Record<string, unknown>).members as Array<{
        sloId: string;
        instanceId?: string;
      }>;
      expect(members[0].instanceId).toBe('instance-x');
      expect(members[1].instanceId).toBe('instance-y');
    });

    apiTest('update to maximum 25 members', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const maxMembers = Array.from({ length: 25 }, (_, i) => ({
        sloId: `max-member-${i}`,
        weight: 1,
      }));

      const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { members: maxMembers },
        responseType: 'json',
      });
      expect(updateRes).toHaveStatusCode(200);
      expect((updateRes.body as Record<string, unknown>).members).toHaveLength(25);
    });

    apiTest('subsequent get reflects the update', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { name: 'Verified Via Get', tags: ['get-verified'] },
        responseType: 'json',
      });

      const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(getRes).toHaveStatusCode(200);

      const body = getRes.body as Record<string, unknown>;
      expect(body.name).toBe('Verified Via Get');
      expect(body.tags).toStrictEqual(['get-verified']);
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

    apiTest('returns 400 when updating members to more than 25', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const tooMany = Array.from({ length: 26 }, (_, i) => ({
        sloId: `overflow-${i}`,
        weight: 1,
      }));

      const response = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { members: tooMany },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when updating members with zero weight', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const response = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: {
          members: [
            { sloId: 'slo-a', weight: 0 },
            { sloId: 'slo-b', weight: 1 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when updating members with negative weight', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const response = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: {
          members: [
            { sloId: 'slo-a', weight: -1 },
            { sloId: 'slo-b', weight: 3 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when updating members with fractional weight', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const response = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: {
          members: [
            { sloId: 'slo-a', weight: 2.5 },
            { sloId: 'slo-b', weight: 3 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when updating members with empty array', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const response = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { members: [] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });
  }
);
