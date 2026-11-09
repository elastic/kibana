/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  DEFAULT_COMPOSITE_SLO,
  mergeSloApiHeaders,
  sloApiPathWithQuery,
} from '../../fixtures';

apiTest.describe(
  'Update Composite SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    const createComposite = async (apiClient: ApiClientFixture) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: DEFAULT_COMPOSITE_SLO,
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      return createRes.body as Record<string, unknown>;
    };

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest('applies a partial update and preserves the other fields', async ({ apiClient }) => {
      const created = await createComposite(apiClient);

      const updateRes = await apiClient.put(
        `api/observability/slo_composites/${created.id as string}`,
        { headers, body: { name: 'Updated Composite Name' }, responseType: 'json' }
      );
      expect(updateRes).toHaveStatusCode(200);

      const body = updateRes.body as Record<string, unknown>;
      expect(body).toMatchObject({
        id: created.id,
        name: 'Updated Composite Name',
        description: DEFAULT_COMPOSITE_SLO.description,
        members: DEFAULT_COMPOSITE_SLO.members,
        objective: DEFAULT_COMPOSITE_SLO.objective,
        tags: DEFAULT_COMPOSITE_SLO.tags,
        enabled: true,
        createdAt: created.createdAt,
      });
      expect(new Date(body.updatedAt as string).getTime()).toBeGreaterThan(
        new Date(created.updatedAt as string).getTime()
      );
    });

    apiTest('updates all mutable fields at once and persists them', async ({ apiClient }) => {
      const created = await createComposite(apiClient);
      const update = {
        name: 'Multi-Update Composite',
        description: 'Updated via multi-field update',
        tags: ['updated-tag-a', 'updated-tag-b'],
        objective: { target: 0.95 },
        members: [
          { sloId: 'multi-slo-1', weight: 10, instanceId: 'instance-x' },
          { sloId: 'multi-slo-1', weight: 20, instanceId: 'instance-y' },
          { sloId: 'multi-slo-2', weight: 30 },
        ],
        enabled: false,
        timeWindow: { duration: '30d', type: 'rolling' as const },
      };

      const updateRes = await apiClient.put(
        `api/observability/slo_composites/${created.id as string}`,
        { headers, body: update, responseType: 'json' }
      );
      expect(updateRes).toHaveStatusCode(200);
      expect(updateRes.body).toMatchObject(update);

      const definitionRes = await apiClient.get(
        `api/observability/slo_composites/_definitions/${created.id as string}`,
        { headers, responseType: 'json' }
      );
      expect(definitionRes).toHaveStatusCode(200);
      expect(definitionRes.body).toMatchObject(update);
    });

    apiTest(
      'reflects the updated name, tags and enabled flag in find results',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Searchable Original',
            tags: ['rename-test'],
            enabled: false,
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const { id } = createRes.body as { id: string };

        const updateRes = await apiClient.put(`api/observability/slo_composites/${id}`, {
          headers,
          body: { name: 'Searchable Renamed', tags: [], enabled: true },
          responseType: 'json',
        });
        expect(updateRes).toHaveStatusCode(200);

        const find = async (query: Record<string, string>) => {
          const response = await apiClient.get(
            sloApiPathWithQuery('api/observability/slo_composites', query),
            { headers, responseType: 'json' }
          );
          expect(response).toHaveStatusCode(200);
          return response.body as {
            total: number;
            results: Array<{ id: string; name: string; tags: string[]; enabled: boolean }>;
          };
        };

        const byNewName = await find({ search: 'Renamed' });
        expect(byNewName.total).toBe(1);
        expect(byNewName.results[0]).toMatchObject({
          id,
          name: 'Searchable Renamed',
          tags: [],
          enabled: true,
        });

        expect((await find({ search: 'Original' })).total).toBe(0);
        expect((await find({ tags: 'rename-test' })).total).toBe(0);
      }
    );

    apiTest('returns 404 when updating a non-existent composite SLO', async ({ apiClient }) => {
      const response = await apiClient.put('api/observability/slo_composites/non-existent-id', {
        headers,
        body: { name: 'Does not matter' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(404);
    });

    apiTest('returns 400 when the body fails schema validation', async ({ apiClient }) => {
      const created = await createComposite(apiClient);

      const response = await apiClient.put(
        `api/observability/slo_composites/${created.id as string}`,
        {
          headers,
          body: { members: [{ sloId: 'single-member-slo', weight: 1 }] },
          responseType: 'json',
        }
      );
      expect(response).toHaveStatusCode(400);
    });
  }
);
