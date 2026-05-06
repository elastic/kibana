/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  DEFAULT_COMPOSITE_SLO,
  mergeSloApiHeaders,
  sloApiPathWithQuery,
} from '../../fixtures';

/**
 * End-to-end lifecycle tests that exercise full create → read → update → find → delete
 * flows for composite SLOs, verifying data consistency across operations.
 */
apiTest.describe(
  'Composite SLO Lifecycle',
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

    apiTest(
      'full CRUD lifecycle: create → get → update → get → delete → verify gone',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Lifecycle Test Composite',
            description: 'Testing the full lifecycle',
            tags: ['lifecycle', 'integration'],
            objective: { target: 0.99 },
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;
        expect(createdId).toBeDefined();

        const getAfterCreate = await apiClient.get(
          `api/observability/slo_composites/${createdId}`,
          { headers, responseType: 'json' }
        );
        expect(getAfterCreate).toHaveStatusCode(200);
        const bodyAfterCreate = getAfterCreate.body as Record<string, unknown>;
        expect(bodyAfterCreate.name).toBe('Lifecycle Test Composite');
        expect(bodyAfterCreate.description).toBe('Testing the full lifecycle');
        expect(bodyAfterCreate.tags).toStrictEqual(['lifecycle', 'integration']);
        expect(bodyAfterCreate.summary).toBeDefined();

        const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: {
            name: 'Updated Lifecycle Composite',
            description: 'Lifecycle has been updated',
            tags: ['lifecycle', 'updated'],
            objective: { target: 0.95 },
            members: [
              { sloId: 'updated-member-1', weight: 5 },
              { sloId: 'updated-member-2', weight: 10 },
              { sloId: 'updated-member-3', weight: 15 },
              { sloId: 'updated-member-4', weight: 20 },
            ],
          },
          responseType: 'json',
        });
        expect(updateRes).toHaveStatusCode(200);
        const updatedBody = updateRes.body as Record<string, unknown>;
        expect(updatedBody.name).toBe('Updated Lifecycle Composite');
        expect(updatedBody.objective).toStrictEqual({ target: 0.95 });

        const getAfterUpdate = await apiClient.get(
          `api/observability/slo_composites/${createdId}`,
          { headers, responseType: 'json' }
        );
        expect(getAfterUpdate).toHaveStatusCode(200);
        const bodyAfterUpdate = getAfterUpdate.body as Record<string, unknown>;
        expect(bodyAfterUpdate.name).toBe('Updated Lifecycle Composite');
        expect(bodyAfterUpdate.description).toBe('Lifecycle has been updated');
        expect(bodyAfterUpdate.tags).toStrictEqual(['lifecycle', 'updated']);
        expect(bodyAfterUpdate.objective).toStrictEqual({ target: 0.95 });
        expect(bodyAfterUpdate.summary).toBeDefined();

        const deleteRes = await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(deleteRes).toHaveStatusCode(204);

        const getAfterDelete = await apiClient.get(
          `api/observability/slo_composites/${createdId}`,
          { headers, responseType: 'json' }
        );
        expect(getAfterDelete).toHaveStatusCode(404);
      }
    );

    apiTest(
      'create multiple composites and verify they are all findable',
      async ({ apiClient }) => {
        const composites = [
          { name: 'Find-Multi Alpha', tags: ['find-multi', 'alpha'] },
          { name: 'Find-Multi Beta', tags: ['find-multi', 'beta'] },
          { name: 'Find-Multi Gamma', tags: ['find-multi', 'gamma'] },
        ];

        const createdIds: string[] = [];
        for (const composite of composites) {
          const res = await apiClient.post('api/observability/slo_composites', {
            headers,
            body: { ...DEFAULT_COMPOSITE_SLO, ...composite },
            responseType: 'json',
          });
          expect(res).toHaveStatusCode(200);
          createdIds.push((res.body as Record<string, unknown>).id as string);
        }

        const findRes = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { tags: 'find-multi' }),
          { headers, responseType: 'json' }
        );
        expect(findRes).toHaveStatusCode(200);
        const findBody = findRes.body as { total: number; results: Array<{ id: string }> };
        expect(findBody.total).toBe(3);

        const foundIds = findBody.results.map((r) => r.id);
        for (const id of createdIds) {
          expect(foundIds).toContain(id);
        }

        for (const id of createdIds) {
          await apiClient.delete(`api/observability/slo_composites/${id}`, {
            headers,
            responseType: 'json',
          });
        }
      }
    );

    apiTest(
      'update → find flow: updated fields appear in search results',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Before Rename',
            tags: ['rename-test'],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { name: 'After Rename' },
          responseType: 'json',
        });

        const findRes = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { search: 'After Rename' }),
          { headers, responseType: 'json' }
        );
        expect(findRes).toHaveStatusCode(200);
        const body = findRes.body as { total: number; results: Array<{ name: string }> };
        expect(body.total).toBe(1);
        expect(body.results[0].name).toBe('After Rename');

        const oldNameSearch = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { search: 'Before Rename' }),
          { headers, responseType: 'json' }
        );
        const oldResults = (oldNameSearch.body as { results: Array<{ name: string }> }).results;
        const exactOldMatch = oldResults.filter((r) => r.name === 'Before Rename');
        expect(exactOldMatch).toHaveLength(0);

        await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
      }
    );

    apiTest('disable → re-enable flow', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, tags: ['toggle-test'] },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;
      expect((createRes.body as Record<string, unknown>).enabled).toBe(true);

      const disableRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { enabled: false },
        responseType: 'json',
      });
      expect(disableRes).toHaveStatusCode(200);
      expect((disableRes.body as Record<string, unknown>).enabled).toBe(false);

      const getDisabled = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect((getDisabled.body as Record<string, unknown>).enabled).toBe(false);

      const enableRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
        headers,
        body: { enabled: true },
        responseType: 'json',
      });
      expect(enableRes).toHaveStatusCode(200);
      expect((enableRes.body as Record<string, unknown>).enabled).toBe(true);

      const getEnabled = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect((getEnabled.body as Record<string, unknown>).enabled).toBe(true);

      await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
    });

    apiTest(
      'progressive member growth: start with 2, expand to 5, then to 10',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Growing Composite',
            members: [
              { sloId: 'growth-slo-0', weight: 1 },
              { sloId: 'growth-slo-1', weight: 1 },
            ],
            tags: ['growth-test'],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const fiveMembers = Array.from({ length: 5 }, (_, i) => ({
          sloId: `growth-slo-${i}`,
          weight: i + 1,
        }));
        const update1 = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { members: fiveMembers },
          responseType: 'json',
        });
        expect(update1).toHaveStatusCode(200);
        expect((update1.body as Record<string, unknown>).members).toHaveLength(5);

        const tenMembers = Array.from({ length: 10 }, (_, i) => ({
          sloId: `growth-slo-${i}`,
          weight: (i % 3) + 1,
        }));
        const update2 = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { members: tenMembers },
          responseType: 'json',
        });
        expect(update2).toHaveStatusCode(200);
        expect((update2.body as Record<string, unknown>).members).toHaveLength(10);

        const getRes = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect((getRes.body as Record<string, unknown>).summary).toBeDefined();

        await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
      }
    );

    apiTest('evolving objective: tighten target over time', async ({ apiClient }) => {
      const createRes = await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Evolving Objective',
          objective: { target: 0.9 },
          tags: ['objective-evolution'],
        },
        responseType: 'json',
      });
      expect(createRes).toHaveStatusCode(200);
      const createdId = (createRes.body as Record<string, unknown>).id as string;

      const targets = [0.95, 0.99, 0.995, 0.999];
      for (const target of targets) {
        const updateRes = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { objective: { target } },
          responseType: 'json',
        });
        expect(updateRes).toHaveStatusCode(200);
        expect((updateRes.body as Record<string, unknown>).objective).toStrictEqual({ target });
      }

      const finalGet = await apiClient.get(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
      expect(finalGet).toHaveStatusCode(200);
      expect((finalGet.body as Record<string, unknown>).objective).toStrictEqual({
        target: 0.999,
      });

      await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
        headers,
        responseType: 'json',
      });
    });

    apiTest(
      'batch operations: create several, find all, delete all, verify empty',
      async ({ apiClient }) => {
        const count = 5;
        const ids: string[] = [];
        for (let i = 0; i < count; i++) {
          const res = await apiClient.post('api/observability/slo_composites', {
            headers,
            body: {
              ...DEFAULT_COMPOSITE_SLO,
              name: `Batch Composite ${i}`,
              tags: ['batch-ops'],
            },
            responseType: 'json',
          });
          expect(res).toHaveStatusCode(200);
          ids.push((res.body as Record<string, unknown>).id as string);
        }

        const findRes = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { tags: 'batch-ops' }),
          { headers, responseType: 'json' }
        );
        expect(findRes).toHaveStatusCode(200);
        expect((findRes.body as Record<string, unknown>).total).toBe(count);

        for (const id of ids) {
          const delRes = await apiClient.delete(`api/observability/slo_composites/${id}`, {
            headers,
            responseType: 'json',
          });
          expect(delRes).toHaveStatusCode(204);
        }

        const emptyFind = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { tags: 'batch-ops' }),
          { headers, responseType: 'json' }
        );
        expect(emptyFind).toHaveStatusCode(200);
        expect((emptyFind.body as Record<string, unknown>).total).toBe(0);
      }
    );

    apiTest(
      'tag management: add, replace, and clear tags through updates',
      async ({ apiClient }) => {
        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            name: 'Tag Management',
            tags: ['original-tag'],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        const createdId = (createRes.body as Record<string, unknown>).id as string;

        const addTags = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { tags: ['original-tag', 'new-tag-1', 'new-tag-2'] },
          responseType: 'json',
        });
        expect(addTags).toHaveStatusCode(200);
        expect((addTags.body as Record<string, unknown>).tags).toStrictEqual([
          'original-tag',
          'new-tag-1',
          'new-tag-2',
        ]);

        const replaceTags = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { tags: ['completely-different'] },
          responseType: 'json',
        });
        expect(replaceTags).toHaveStatusCode(200);
        expect((replaceTags.body as Record<string, unknown>).tags).toStrictEqual([
          'completely-different',
        ]);

        const clearTags = await apiClient.put(`api/observability/slo_composites/${createdId}`, {
          headers,
          body: { tags: [] },
          responseType: 'json',
        });
        expect(clearTags).toHaveStatusCode(200);
        expect((clearTags.body as Record<string, unknown>).tags).toStrictEqual([]);

        await apiClient.delete(`api/observability/slo_composites/${createdId}`, {
          headers,
          responseType: 'json',
        });
      }
    );

    apiTest(
      'custom ID lifecycle: create with custom ID → get → update → delete → recreate',
      async ({ apiClient }) => {
        const customId = 'lifecycle-custom-id';

        const createRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            id: customId,
            name: 'Custom ID Original',
            tags: ['custom-id-lifecycle'],
          },
          responseType: 'json',
        });
        expect(createRes).toHaveStatusCode(200);
        expect((createRes.body as Record<string, unknown>).id).toBe(customId);

        const getRes = await apiClient.get(`api/observability/slo_composites/${customId}`, {
          headers,
          responseType: 'json',
        });
        expect(getRes).toHaveStatusCode(200);
        expect((getRes.body as Record<string, unknown>).name).toBe('Custom ID Original');

        const updateRes = await apiClient.put(`api/observability/slo_composites/${customId}`, {
          headers,
          body: { name: 'Custom ID Updated' },
          responseType: 'json',
        });
        expect(updateRes).toHaveStatusCode(200);
        expect((updateRes.body as Record<string, unknown>).id).toBe(customId);
        expect((updateRes.body as Record<string, unknown>).name).toBe('Custom ID Updated');

        await apiClient.delete(`api/observability/slo_composites/${customId}`, {
          headers,
          responseType: 'json',
        });

        const recreateRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: {
            ...DEFAULT_COMPOSITE_SLO,
            id: customId,
            name: 'Custom ID Recreated',
            tags: ['custom-id-lifecycle'],
          },
          responseType: 'json',
        });
        expect(recreateRes).toHaveStatusCode(200);
        expect((recreateRes.body as Record<string, unknown>).id).toBe(customId);
        expect((recreateRes.body as Record<string, unknown>).name).toBe('Custom ID Recreated');

        await apiClient.delete(`api/observability/slo_composites/${customId}`, {
          headers,
          responseType: 'json',
        });
      }
    );
  }
);
