/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTestWithoutDataForge as apiTest,
  cleanupSloSummaryDocs,
  insertSloSummaryDocs,
  TEST_SPACE_ID,
  createDummySummaryDoc,
} from '../fixtures';

apiTest.describe(
  'Search SLO Definitions',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.afterEach(async ({ esClient }) => {
      await cleanupSloSummaryDocs(esClient);
    });

    apiTest('searches SLO definitions by name', async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      await insertSloSummaryDocs(esClient, [
        createDummySummaryDoc('slo-alpha', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO Alpha',
          tags: ['alpha'],
        }),
        createDummySummaryDoc('slo-beta', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO Beta',
          tags: ['beta'],
        }),
      ]);

      const searchResultsRes = await apiServices.slo.searchDefinitions({ search: 'Alpha' });
      expect(searchResultsRes).toHaveStatusCode(200);
      const searchResults = searchResultsRes.body as {
        results: Array<{ id: string; name: string }>;
      };
      expect(searchResults.results).toHaveLength(1);
      expect(searchResults.results[0].id).toBe('slo-alpha');
      expect(searchResults.results[0].name).toBe('Test SLO Alpha');
    });

    apiTest(
      'returns all SLO definitions when no search term is provided',
      async ({ apiServices, esClient }) => {
        const now = new Date().toISOString();
        await insertSloSummaryDocs(esClient, [
          createDummySummaryDoc('slo-gamma', '*', now, TEST_SPACE_ID, { name: 'Test SLO Gamma' }),
          createDummySummaryDoc('slo-delta', '*', now, TEST_SPACE_ID, { name: 'Test SLO Delta' }),
        ]);

        const searchResultsRes = await apiServices.slo.searchDefinitions({});
        expect(searchResultsRes).toHaveStatusCode(200);
        const searchResults = searchResultsRes.body as { results: Array<{ id: string }> };
        expect(searchResults.results.length).toBeGreaterThan(1);
        const resultIds = searchResults.results.map((r) => r.id);
        expect(resultIds).toContain('slo-gamma');
        expect(resultIds).toContain('slo-delta');
      }
    );

    apiTest('respects the size parameter', async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      const docs = Array.from({ length: 5 }, (_, i) =>
        createDummySummaryDoc(`slo-size-${i}`, '*', now, TEST_SPACE_ID, {
          name: `Test SLO Size ${i}`,
        })
      );
      await insertSloSummaryDocs(esClient, docs);

      const searchResultsRes = await apiServices.slo.searchDefinitions({ size: 2 });
      expect(searchResultsRes).toHaveStatusCode(200);
      const searchResults = searchResultsRes.body as { results: unknown[] };
      expect(searchResults.results.length).toBeLessThan(3);
    });

    apiTest('handles pagination with searchAfter', async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      const docs = Array.from({ length: 3 }, (_, i) =>
        createDummySummaryDoc(`slo-pagination-${i}`, '*', now, TEST_SPACE_ID, {
          name: `Test SLO Pagination ${i}`,
        })
      );
      await insertSloSummaryDocs(esClient, docs);

      const firstPageRes = await apiServices.slo.searchDefinitions({ size: 1 });
      expect(firstPageRes).toHaveStatusCode(200);
      const firstPage = firstPageRes.body as {
        results: Array<{ id: string }>;
        searchAfter?: string;
      };
      expect(firstPage.results).toHaveLength(1);
      expect(firstPage.searchAfter).toBeDefined();
      const secondPageRes = await apiServices.slo.searchDefinitions({
        size: 1,
        searchAfter: firstPage.searchAfter as string,
      });
      expect(secondPageRes).toHaveStatusCode(200);
      const secondPage = secondPageRes.body as { results: Array<{ id: string }> };
      expect(secondPage.results.length).toBeLessThan(2);
      expect(secondPage.results[0].id).not.toBe(firstPage.results[0].id);
    });

    apiTest('normalizes groupBy array correctly', async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      await insertSloSummaryDocs(esClient, [
        createDummySummaryDoc('slo-groupby', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO with GroupBy',
          groupBy: ['host', 'service'],
        }),
      ]);

      const searchResultsRes = await apiServices.slo.searchDefinitions({ search: 'GroupBy' });
      expect(searchResultsRes).toHaveStatusCode(200);
      const searchResults = searchResultsRes.body as {
        results: Array<{ id: string; groupBy: string[] }>;
      };
      expect(searchResults.results.length).toBeGreaterThan(0);
      const result = searchResults.results.find((r) => r.id === 'slo-groupby');
      expect(result).toBeDefined();
      expect(Array.isArray(result!.groupBy)).toBe(true);
      expect(result!.groupBy).toContain('host');
      expect(result!.groupBy).toContain('service');
    });

    apiTest('handles SLOs with ALL_VALUE groupBy', async ({ apiServices, esClient }) => {
      const now = new Date().toISOString();
      await insertSloSummaryDocs(esClient, [
        createDummySummaryDoc('slo-allvalue', '*', now, TEST_SPACE_ID, {
          name: 'Test SLO with All Value',
          groupBy: '*',
        }),
      ]);

      const searchResultsRes = await apiServices.slo.searchDefinitions({ search: 'All Value' });
      expect(searchResultsRes).toHaveStatusCode(200);
      const searchResults = searchResultsRes.body as {
        results: Array<{ id: string; groupBy: string[] }>;
      };
      expect(searchResults.results.length).toBeGreaterThan(0);
      const result = searchResults.results.find((r) => r.id === 'slo-allvalue');
      expect(result).toBeDefined();
      expect(Array.isArray(result!.groupBy)).toBe(true);
      expect(result!.groupBy).toHaveLength(0);
    });

    apiTest('handles invalid searchAfter gracefully', async ({ apiServices }) => {
      const searchResultsRes = await apiServices.slo.searchDefinitions({
        searchAfter: 'invalid-json',
      });
      expect(searchResultsRes).toHaveStatusCode(200);
      const searchResults = searchResultsRes.body as { results: unknown[] };
      expect(Array.isArray(searchResults.results)).toBe(true);
    });

    apiTest('returns empty results when no SLOs match', async ({ apiServices }) => {
      const searchResultsRes = await apiServices.slo.searchDefinitions({
        search: 'NonExistentSLO12345',
      });
      expect(searchResultsRes).toHaveStatusCode(200);
      const searchResults = searchResultsRes.body as { results: unknown[] };
      expect(searchResults.results).toHaveLength(0);
    });
  }
);
