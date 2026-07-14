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
  DEFAULT_SLO,
  mergeSloApiHeaders,
  pollUntilTrue,
  sloApiPathWithQuery,
} from '../../fixtures';

apiTest.describe(
  'Find SLOs using kql query',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('searches SLOs using kqlQuery', async ({ apiClient }) => {
      const testTag = `test-${Date.now()}`;
      const createResponse1 = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          tags: ['test', testTag],
          groupBy: '*',
        },
        responseType: 'json',
      });
      expect(createResponse1).toHaveStatusCode(200);
      const createResponse2 = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          name: 'something irrelevant foo',
          tags: ['test', testTag],
          groupBy: '*',
        },
        responseType: 'json',
      });
      expect(createResponse2).toHaveStatusCode(200);

      const sloId1 = createResponse1.body.id as string;
      const sloId2 = createResponse2.body.id as string;

      await pollUntilTrue(
        async () => {
          let response = await apiClient.get(
            sloApiPathWithQuery('api/observability/slos', {
              page: 1,
              perPage: 333,
              kqlQuery: `slo.tags:"${testTag}"`,
            }),
            { headers, responseType: 'json' }
          );
          if (response.statusCode !== 200) {
            return false;
          }
          const b = response.body as {
            results?: unknown[];
            page?: number;
            perPage?: number;
            total?: number;
          };
          if (
            !b.results ||
            b.results.length !== 2 ||
            b.page !== 1 ||
            b.perPage !== 333 ||
            b.total !== 2
          ) {
            return false;
          }

          response = await apiClient.get(
            sloApiPathWithQuery('api/observability/slos', {
              size: 222,
              kqlQuery: 'slo.name:irrelevant',
            }),
            { headers, responseType: 'json' }
          );
          if (response.statusCode !== 200) {
            return false;
          }
          const b2 = response.body as {
            page?: number;
            perPage?: number;
            size?: number;
            searchAfter?: unknown;
            results?: Array<{ id?: string }>;
          };
          if (
            b2.page !== 1 ||
            b2.perPage !== 25 ||
            b2.size !== 222 ||
            b2.searchAfter === undefined ||
            !b2.results ||
            b2.results.length !== 1 ||
            b2.results[0].id !== sloId2
          ) {
            return false;
          }

          response = await apiClient.get(
            sloApiPathWithQuery('api/observability/slos', { kqlQuery: 'slo.name:integration' }),
            { headers, responseType: 'json' }
          );
          if (response.statusCode !== 200) {
            return false;
          }
          const b3 = response.body as { results?: Array<{ id?: string }> };
          if (!b3.results || b3.results.length !== 1 || b3.results[0].id !== sloId1) {
            return false;
          }

          return true;
        },
        { timeoutMs: 180_000, intervalMs: 3000, label: 'SLO kql search' }
      );
    });
  }
);
