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

      await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Composite Delta',
          tags: ['team-c', 'env-production'],
        },
        responseType: 'json',
      });
      await apiClient.post('api/observability/slo_composites', {
        headers,
        body: {
          ...DEFAULT_COMPOSITE_SLO,
          name: 'Composite Epsilon',
          tags: ['team-a', 'env-production'],
        },
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
      expect(body.total).toBe(5);
      expect(body.page).toBe(1);
      expect(body.perPage).toBe(25);
      expect(body.results).toHaveLength(5);
    });

    apiTest('paginates results', async ({ apiClient }) => {
      const page1 = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { page: 1, perPage: 2 }),
        { headers, responseType: 'json' }
      );
      expect(page1).toHaveStatusCode(200);
      const page1Body = page1.body as Record<string, unknown>;
      expect(page1Body.total).toBe(5);
      expect(page1Body.page).toBe(1);
      expect(page1Body.perPage).toBe(2);
      expect(page1Body.results).toHaveLength(2);

      const page2 = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { page: 2, perPage: 2 }),
        { headers, responseType: 'json' }
      );
      expect(page2).toHaveStatusCode(200);
      const page2Body = page2.body as Record<string, unknown>;
      expect(page2Body.total).toBe(5);
      expect(page2Body.page).toBe(2);
      expect(page2Body.perPage).toBe(2);
      expect(page2Body.results).toHaveLength(2);

      const page3 = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { page: 3, perPage: 2 }),
        { headers, responseType: 'json' }
      );
      expect(page3).toHaveStatusCode(200);
      const page3Body = page3.body as Record<string, unknown>;
      expect(page3Body.total).toBe(5);
      expect(page3Body.page).toBe(3);
      expect(page3Body.perPage).toBe(2);
      expect(page3Body.results).toHaveLength(1);
    });

    apiTest('filters by a single tag', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { tags: 'team-a' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; results: Array<{ tags: string[] }> };
      expect(body.total).toBe(3);
      for (const result of body.results) {
        expect(result.tags).toContain('team-a');
      }
    });

    apiTest('filters by multiple comma-separated tags', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { tags: 'team-a,env-production' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as {
        total: number;
        results: Array<{ name: string; tags: string[] }>;
      };
      expect(body.total).toBeGreaterThan(3);
      for (const result of body.results) {
        const hasTeamA = result.tags.includes('team-a');
        const hasEnvProd = result.tags.includes('env-production');
        expect(hasTeamA || hasEnvProd).toBe(true);
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

    apiTest('searches by partial name match', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { search: 'Composite' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; results: Array<{ name: string }> };
      expect(body.total).toBe(5);
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
      expect(results[2].name).toBe('Composite Delta');
      expect(results[3].name).toBe('Composite Epsilon');
      expect(results[4].name).toBe('Composite Gamma');
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
      expect(results[1].name).toBe('Composite Epsilon');
      expect(results[2].name).toBe('Composite Delta');
      expect(results[3].name).toBe('Composite Beta');
      expect(results[4].name).toBe('Composite Alpha');
    });

    apiTest('sorts by createdAt descending by default', async ({ apiClient }) => {
      const response = await apiClient.get('api/observability/slo_composites', {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const { results } = response.body as {
        results: Array<{ name: string; createdAt: string }>;
      };
      for (let i = 0; i < results.length - 1; i++) {
        const current = new Date(results[i].createdAt).getTime();
        const next = new Date(results[i + 1].createdAt).getTime();
        expect(current).toBeGreaterThan(next);
      }
    });

    apiTest('sorts by createdAt ascending', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', {
          sortBy: 'createdAt',
          sortDirection: 'asc',
        }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const { results } = response.body as {
        results: Array<{ createdAt: string }>;
      };
      for (let i = 0; i < results.length - 1; i++) {
        const current = new Date(results[i].createdAt).getTime();
        const next = new Date(results[i + 1].createdAt).getTime();
        expect(current).toBeLessThan(next);
      }
    });

    apiTest('combines search and tag filters', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', {
          search: 'Epsilon',
          tags: 'env-production',
        }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as {
        total: number;
        results: Array<{ name: string; tags: string[] }>;
      };
      expect(body.total).toBe(1);
      expect(body.results[0].name).toBe('Composite Epsilon');
      expect(body.results[0].tags).toContain('env-production');
    });

    apiTest('combines pagination with sorting', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', {
          page: 1,
          perPage: 3,
          sortBy: 'name',
          sortDirection: 'asc',
        }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as {
        total: number;
        page: number;
        perPage: number;
        results: Array<{ name: string }>;
      };
      expect(body.total).toBe(5);
      expect(body.results).toHaveLength(3);
      expect(body.results[0].name).toBe('Composite Alpha');
      expect(body.results[2].name).toBe('Composite Delta');
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

    apiTest('returns empty results when no composites match tag filter', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { tags: 'nonexistent-tag' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; results: unknown[] };
      expect(body.total).toBe(0);
      expect(body.results).toHaveLength(0);
    });

    apiTest('returns empty results for page beyond available data', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', { page: 100, perPage: 25 }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);

      const body = response.body as { total: number; page: number; results: unknown[] };
      expect(body.total).toBe(5);
      expect(body.page).toBe(100);
      expect(body.results).toHaveLength(0);
    });

    apiTest(
      'each result includes the full composite SLO definition shape',
      async ({ apiClient }) => {
        const response = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', { perPage: 1 }),
          { headers, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);

        const { results } = response.body as {
          results: Array<Record<string, unknown>>;
        };
        expect(results).toHaveLength(1);

        const result = results[0];
        expect(result.id).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.description).toBeDefined();
        expect(result.compositeMethod).toBeDefined();
        expect(result.timeWindow).toBeDefined();
        expect(result.budgetingMethod).toBeDefined();
        expect(result.objective).toBeDefined();
        expect(result.members).toBeDefined();
        expect(result.tags).toBeDefined();
        expect(result.enabled).toBeDefined();
        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(result.createdBy).toBeDefined();
        expect(result.updatedBy).toBeDefined();
        expect(result.version).toBeDefined();
      }
    );

    apiTest('preserves perPage=1 across multiple pages', async ({ apiClient }) => {
      const names: string[] = [];
      for (let page = 1; page <= 5; page++) {
        const response = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_composites', {
            page,
            perPage: 1,
            sortBy: 'name',
            sortDirection: 'asc',
          }),
          { headers, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        const body = response.body as { results: Array<{ name: string }> };
        expect(body.results).toHaveLength(1);
        names.push(body.results[0].name);
      }

      expect(names).toStrictEqual([
        'Composite Alpha',
        'Composite Beta',
        'Composite Delta',
        'Composite Epsilon',
        'Composite Gamma',
      ]);
    });
  }
);
