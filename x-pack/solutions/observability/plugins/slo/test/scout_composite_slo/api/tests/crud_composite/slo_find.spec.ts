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
  'Find Composite SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiServices, apiClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();

      await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, name: 'Composite Alpha', tags: ['team-a'] },
        responseType: 'json',
      });
      await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, name: 'Composite Beta', tags: ['team-b'] },
        responseType: 'json',
      });
      await apiClient.post('api/observability/slo_composites', {
        headers,
        body: { ...DEFAULT_COMPOSITE_SLO, name: 'Composite Gamma', tags: ['team-a', 'team-b'] },
        responseType: 'json',
      });
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest('returns all composite SLOs with default pagination', async ({ apiClient }) => {
      const response = await apiClient.get('api/observability/slo_composites', {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as Record<string, unknown>;
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.perPage).toBe(25);
      expect(body.results).toHaveLength(3);
    });

    apiTest('paginates results', async ({ apiClient }) => {
      const page1 = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { page: 1, perPage: 2 }),
        { headers, responseType: 'json' }
      );
      expect(page1).toHaveStatusCode(200);
      const page1Body = page1.body as Record<string, unknown>;
      expect(page1Body.total).toBe(3);
      expect(page1Body.page).toBe(1);
      expect(page1Body.perPage).toBe(2);
      expect(page1Body.results).toHaveLength(2);

      const page2 = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { page: 2, perPage: 2 }),
        { headers, responseType: 'json' }
      );
      expect(page2).toHaveStatusCode(200);
      const page2Body = page2.body as Record<string, unknown>;
      expect(page2Body.total).toBe(3);
      expect(page2Body.page).toBe(2);
      expect(page2Body.perPage).toBe(2);
      expect(page2Body.results).toHaveLength(1);
    });

    apiTest('filters by tags', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { tags: 'team-a' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; results: Array<{ tags: string[] }> };
      expect(body.total).toBe(2);
      for (const result of body.results) {
        expect(result.tags).toContain('team-a');
      }
    });

    apiTest('searches by name', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { search: 'Alpha' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; results: Array<{ name: string }> };
      expect(body.total).toBe(1);
      expect(body.results[0].name).toBe('Composite Alpha');
    });

    apiTest('sorts by name ascending', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', {
          sortBy: 'name',
          sortDirection: 'asc',
        }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const { results } = response.body as { results: Array<{ name: string }> };
      expect(results[0].name).toBe('Composite Alpha');
      expect(results[1].name).toBe('Composite Beta');
      expect(results[2].name).toBe('Composite Gamma');
    });

    apiTest('sorts by name descending', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', {
          sortBy: 'name',
          sortDirection: 'desc',
        }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const { results } = response.body as { results: Array<{ name: string }> };
      expect(results[0].name).toBe('Composite Gamma');
      expect(results[1].name).toBe('Composite Beta');
      expect(results[2].name).toBe('Composite Alpha');
    });

    apiTest('returns empty results when no composites match search', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { search: 'zzz-no-match-xyz' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; results: unknown[] };
      expect(body.total).toBe(0);
      expect(body.results).toHaveLength(0);
    });
  }
);
