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

    apiTest(
      'deletes only the targeted composite SLO and removes it from find results',
      async ({ apiClient, apiServices }) => {
        const toDelete = await apiServices.compositeSlo.create({
          ...DEFAULT_COMPOSITE_SLO,
          name: 'To Delete',
          tags: ['delete-test'],
        });
        const toKeep = await apiServices.compositeSlo.create({
          ...DEFAULT_COMPOSITE_SLO,
          name: 'To Keep',
          tags: ['delete-test'],
        });
        const deletedId = (toDelete.body as { id: string }).id;
        const keptId = (toKeep.body as { id: string }).id;

        const deleteRes = await apiClient.delete(`api/observability/slo_composites/${deletedId}`, {
          headers,
          responseType: 'json',
        });
        expect(deleteRes).toHaveStatusCode(204);

        const getDeleted = await apiClient.get(`api/observability/slo_composites/${deletedId}`, {
          headers,
          responseType: 'json',
        });
        expect(getDeleted).toHaveStatusCode(404);

        const findRes = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { tags: 'delete-test' }),
          { headers, responseType: 'json' }
        );
        expect(findRes).toHaveStatusCode(200);
        const { total, results } = findRes.body as {
          total: number;
          results: Array<{ id: string }>;
        };
        expect(total).toBe(1);
        expect(results[0].id).toBe(keptId);
      }
    );

    apiTest(
      'returns 404 for a non-existent composite SLO and on double delete',
      async ({ apiClient, apiServices }) => {
        const missing = await apiClient.delete('api/observability/slo_composites/non-existent-id', {
          headers,
          responseType: 'json',
        });
        expect(missing).toHaveStatusCode(404);

        const created = await apiServices.compositeSlo.create(DEFAULT_COMPOSITE_SLO);
        const createdId = (created.body as { id: string }).id;

        const firstDelete = await apiClient.delete(
          `api/observability/slo_composites/${createdId}`,
          { headers, responseType: 'json' }
        );
        expect(firstDelete).toHaveStatusCode(204);

        const secondDelete = await apiClient.delete(
          `api/observability/slo_composites/${createdId}`,
          { headers, responseType: 'json' }
        );
        expect(secondDelete).toHaveStatusCode(404);
      }
    );

    apiTest(
      'can recreate a composite SLO with the same id after deletion',
      async ({ apiClient, apiServices }) => {
        const customId = 'reusable-composite-id';
        await apiServices.compositeSlo.create({
          ...DEFAULT_COMPOSITE_SLO,
          id: customId,
          name: 'Original',
        });

        const deleteRes = await apiClient.delete(`api/observability/slo_composites/${customId}`, {
          headers,
          responseType: 'json',
        });
        expect(deleteRes).toHaveStatusCode(204);

        const recreateRes = await apiClient.post('api/observability/slo_composites', {
          headers,
          body: { ...DEFAULT_COMPOSITE_SLO, id: customId, name: 'Recreated' },
          responseType: 'json',
        });
        expect(recreateRes).toHaveStatusCode(200);
        expect(recreateRes.body).toMatchObject({ id: customId, name: 'Recreated' });
      }
    );
  }
);
