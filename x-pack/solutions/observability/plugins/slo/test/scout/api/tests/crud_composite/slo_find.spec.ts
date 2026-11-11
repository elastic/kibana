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

interface FindResponse {
  total: number;
  page: number;
  perPage: number;
  results: Array<{ name: string; tags: string[]; createdAt: string }>;
}

apiTest.describe(
  'Find Composite SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    const find = async (apiClient: ApiClientFixture, query: Record<string, string | number>) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_composites', query),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      return response.body as FindResponse;
    };

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      await apiServices.compositeSlo.deleteAll();

      const composites = [
        { name: 'Composite Alpha', tags: ['team-a'] },
        { name: 'Composite Beta', tags: ['team-b'] },
        { name: 'Composite Gamma', tags: ['team-a', 'team-b'] },
        { name: 'Composite Delta', tags: ['team-c', 'env-production'] },
        { name: 'Composite Epsilon', tags: ['team-a', 'env-production'] },
      ];
      for (const composite of composites) {
        const response = await apiServices.compositeSlo.create({
          ...DEFAULT_COMPOSITE_SLO,
          ...composite,
        });
        expect(response).toHaveStatusCode(200);
      }
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.deleteAll();
    });

    apiTest('returns all composite SLOs with default pagination', async ({ apiClient }) => {
      const body = await find(apiClient, {});
      expect(body.total).toBe(5);
      expect(body.page).toBe(1);
      expect(body.perPage).toBe(25);
      expect(body.results).toHaveLength(5);
    });

    apiTest('paginates results', async ({ apiClient }) => {
      const page1 = await find(apiClient, { page: 1, perPage: 2 });
      expect(page1).toMatchObject({ total: 5, page: 1, perPage: 2 });
      expect(page1.results).toHaveLength(2);

      const page3 = await find(apiClient, { page: 3, perPage: 2 });
      expect(page3).toMatchObject({ total: 5, page: 3, perPage: 2 });
      expect(page3.results).toHaveLength(1);

      const beyond = await find(apiClient, { page: 100, perPage: 25 });
      expect(beyond).toMatchObject({ total: 5, page: 100 });
      expect(beyond.results).toHaveLength(0);
    });

    apiTest('filters by tags with OR semantics', async ({ apiClient }) => {
      const single = await find(apiClient, { tags: 'team-a' });
      expect(single.results.map(({ name }) => name).sort()).toStrictEqual([
        'Composite Alpha',
        'Composite Epsilon',
        'Composite Gamma',
      ]);

      const multiple = await find(apiClient, { tags: 'team-c,env-production' });
      expect(multiple.results.map(({ name }) => name).sort()).toStrictEqual([
        'Composite Delta',
        'Composite Epsilon',
      ]);

      const none = await find(apiClient, { tags: 'nonexistent-tag' });
      expect(none.total).toBe(0);
    });

    apiTest('searches by name, alone and combined with tags', async ({ apiClient }) => {
      const byName = await find(apiClient, { search: 'Alpha' });
      expect(byName.results.map(({ name }) => name)).toStrictEqual(['Composite Alpha']);

      const combined = await find(apiClient, { search: 'Epsilon', tags: 'env-production' });
      expect(combined.results.map(({ name }) => name)).toStrictEqual(['Composite Epsilon']);

      const noMatch = await find(apiClient, { search: 'zzz-no-match-xyz' });
      expect(noMatch.total).toBe(0);
      expect(noMatch.results).toHaveLength(0);
    });

    apiTest('sorts by name in both directions', async ({ apiClient }) => {
      const sortedNames = [
        'Composite Alpha',
        'Composite Beta',
        'Composite Delta',
        'Composite Epsilon',
        'Composite Gamma',
      ];

      const asc = await find(apiClient, { sortBy: 'name', sortDirection: 'asc' });
      expect(asc.results.map(({ name }) => name)).toStrictEqual(sortedNames);

      const desc = await find(apiClient, { sortBy: 'name', sortDirection: 'desc' });
      expect(desc.results.map(({ name }) => name)).toStrictEqual([...sortedNames].reverse());
    });

    apiTest(
      'sorts by createdAt descending by default and ascending on request',
      async ({ apiClient }) => {
        const toTimestamps = ({ results }: FindResponse) =>
          results.map(({ createdAt }) => new Date(createdAt).getTime());

        const byDefault = toTimestamps(await find(apiClient, {}));
        expect(byDefault).toStrictEqual([...byDefault].sort((a, b) => b - a));

        const asc = toTimestamps(
          await find(apiClient, { sortBy: 'createdAt', sortDirection: 'asc' })
        );
        expect(asc).toStrictEqual([...asc].sort((a, b) => a - b));
      }
    );
  }
);
