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

    apiTest('creates a composite SLO with exactly 2 members (minimum)', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-min-a', weight: 1 },
            { sloId: 'slo-min-b', weight: 1 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      const members = body.members as Array<{ sloId: string; weight: number }>;
      expect(members).toHaveLength(2);
      expect(members[0].sloId).toBe('slo-min-a');
      expect(members[1].sloId).toBe('slo-min-b');
    });

    apiTest('creates a composite SLO with exactly 25 members (maximum)', async ({ apiClient }) => {
      const maxMembers = Array.from({ length: 25 }, (_, i) => ({
        sloId: `slo-max-${i}`,
        weight: i + 1,
      }));

      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, members: maxMembers },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      const members = body.members as Array<{ sloId: string; weight: number }>;
      expect(members).toHaveLength(25);
      expect(members[0].weight).toBe(1);
      expect(members[24].weight).toBe(25);
    });

    apiTest('creates a composite SLO with members that have instanceId', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'grouped-slo-1', weight: 3, instanceId: 'host-a' },
            { sloId: 'grouped-slo-2', weight: 2, instanceId: 'host-b' },
            { sloId: 'grouped-slo-3', weight: 1 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      const members = body.members as Array<{
        sloId: string;
        weight: number;
        instanceId?: string;
      }>;
      expect(members).toHaveLength(3);
      expect(members[0].instanceId).toBe('host-a');
      expect(members[1].instanceId).toBe('host-b');
      expect(members[2].instanceId).toBeUndefined();
    });

    apiTest('creates a composite SLO with large weights', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-heavy-1', weight: 100 },
            { sloId: 'slo-heavy-2', weight: 500 },
            { sloId: 'slo-heavy-3', weight: 1000 },
          ],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const members = (response.body as Record<string, unknown>).members as Array<{
        weight: number;
      }>;
      expect(members[0].weight).toBe(100);
      expect(members[1].weight).toBe(500);
      expect(members[2].weight).toBe(1000);
    });

    apiTest('creates a composite SLO with multiple tags', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          tags: ['team-platform', 'env-production', 'tier-critical', 'region-us-east'],
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      expect((response.body as Record<string, unknown>).tags).toStrictEqual([
        'team-platform',
        'env-production',
        'tier-critical',
        'region-us-east',
      ]);
    });

    apiTest(
      'creates a composite SLO with a stringent objective (99.99%)',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: { ...DEFAULT_COMPOSITE_SLO, objective: { target: 0.9999 } },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect((response.body as Record<string, unknown>).objective).toStrictEqual({
          target: 0.9999,
        });
      }
    );

    apiTest('creates a composite SLO with a lenient objective (90%)', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, objective: { target: 0.9 } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect((response.body as Record<string, unknown>).objective).toStrictEqual({
        target: 0.9,
      });
    });

    apiTest('creates a composite SLO with a 30d time window', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          timeWindow: { duration: '30d', type: 'rolling' as const },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const tw = (response.body as Record<string, unknown>).timeWindow as Record<string, unknown>;
      expect(tw).toStrictEqual({ duration: '30d', type: 'rolling' });
    });

    apiTest('creates a composite SLO with a 90d time window', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          timeWindow: { duration: '90d', type: 'rolling' as const },
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const tw = (response.body as Record<string, unknown>).timeWindow as Record<string, unknown>;
      expect(tw).toStrictEqual({ duration: '90d', type: 'rolling' });
    });

    apiTest('returns 409 when creating with a duplicate custom id', async ({ apiClient }) => {
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

    apiTest('returns 400 when members array is empty', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, members: [] },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(400);
    });

    apiTest('returns 400 when more than 25 members are provided', async ({ apiClient }) => {
      const tooManyMembers = Array.from({ length: 26 }, (_, i) => ({
        sloId: `slo-overflow-${i}`,
        weight: 1,
      }));

      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, members: tooManyMembers },
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

    apiTest('returns 400 when a member has a negative weight', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          members: [
            { sloId: 'slo-1', weight: -5 },
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

    apiTest('auto-generates an id when none is provided', async ({ apiClient }) => {
      const { id: _unused, ...bodyWithoutId } = DEFAULT_COMPOSITE_SLO as Record<string, unknown>;
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: bodyWithoutId,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      expect(body.id).toBeDefined();
      expect(typeof body.id).toBe('string');
      expect((body.id as string).length).toBeGreaterThan(0);
    });

    apiTest('defaults enabled to true when not specified', async ({ apiClient }) => {
      const { enabled: _unused, ...bodyWithoutEnabled } = DEFAULT_COMPOSITE_SLO as Record<
        string,
        unknown
      >;
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: bodyWithoutEnabled,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect((response.body as Record<string, unknown>).enabled).toBe(true);
    });

    apiTest('sets version to 1 on creation', async ({ apiClient }) => {
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect((response.body as Record<string, unknown>).version).toBe(1);
    });

    apiTest('sets createdAt and updatedAt timestamps on creation', async ({ apiClient }) => {
      const beforeCreate = Date.now();
      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      const createdAt = new Date(body.createdAt as string).getTime();
      const updatedAt = new Date(body.updatedAt as string).getTime();

      expect(createdAt).toBeGreaterThan(beforeCreate - 5000);
      expect(updatedAt).toBeGreaterThan(beforeCreate - 5000);
      expect(createdAt).toBe(updatedAt);
    });

    apiTest('preserves member ordering in the response', async ({ apiClient }) => {
      const orderedMembers = [
        { sloId: 'first-slo', weight: 5 },
        { sloId: 'second-slo', weight: 3 },
        { sloId: 'third-slo', weight: 8 },
        { sloId: 'fourth-slo', weight: 1 },
      ];

      const response = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, members: orderedMembers },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const members = (response.body as Record<string, unknown>).members as Array<{
        sloId: string;
        weight: number;
      }>;
      expect(members[0].sloId).toBe('first-slo');
      expect(members[1].sloId).toBe('second-slo');
      expect(members[2].sloId).toBe('third-slo');
      expect(members[3].sloId).toBe('fourth-slo');
    });
  }
);
