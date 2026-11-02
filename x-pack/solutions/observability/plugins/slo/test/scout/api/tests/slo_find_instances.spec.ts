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
  cleanupSloSummaryDocs,
  DEFAULT_SLO,
  insertSloSummaryDocs,
  mergeSloApiHeaders,
  sloApiPathWithQuery,
  TEST_SPACE_ID,
  createGroupedSummaryDoc,
} from '../fixtures';

const GROUP_BY = ['host'] as const;

apiTest.describe(
  'Find SLO Instances',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let sloId: string;
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      const response = await apiServices.slo.create({ ...DEFAULT_SLO, groupBy: 'host' });
      expect(response).toHaveStatusCode(200);
      sloId = response.body.id as string;
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupSloSummaryDocs(esClient);
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('returns all instances for a given SLO id', async ({ apiClient, esClient }) => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-1' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-2' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-3' }, now),
        createGroupedSummaryDoc('other-slo', [...GROUP_BY], { host: 'instance-1' }, now),
      ];
      await insertSloSummaryDocs(esClient, docs);

      const response = await apiClient.get(
        sloApiPathWithQuery(`internal/observability/slos/${sloId}/_instances`, {}),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as { results: Array<{ instanceId: string }> };
      const actualInstances = body.results.filter((r) => r.instanceId !== '*');
      expect(actualInstances).toHaveLength(3);
      expect(actualInstances.map((r) => r.instanceId).sort()).toStrictEqual([
        'instance-1',
        'instance-2',
        'instance-3',
      ]);
    });

    apiTest('filters instances by search term', async ({ apiClient, esClient }) => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'admin-console.001' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'admin-console.002' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'user-service.001' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'user-service.002' }, now),
      ];
      await insertSloSummaryDocs(esClient, docs);

      const response = await apiClient.get(
        sloApiPathWithQuery(`internal/observability/slos/${sloId}/_instances`, { search: 'admin' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as { results: Array<{ instanceId: string }> };
      expect(body.results).toHaveLength(2);
      expect(body.results.map((r) => r.instanceId).sort()).toStrictEqual([
        'admin-console.001',
        'admin-console.002',
      ]);
    });

    apiTest('returns 404 for non-existent SLO id', async ({ apiClient, esClient }) => {
      const now = new Date().toISOString();
      await insertSloSummaryDocs(esClient, [
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-1' }, now),
      ]);

      const response = await apiClient.get(
        sloApiPathWithQuery('internal/observability/slos/non-existent-slo/_instances', {}),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(404);
    });

    apiTest('respects size parameter', async ({ apiClient, esClient }) => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-1' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-2' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-3' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-4' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-5' }, now),
      ];
      await insertSloSummaryDocs(esClient, docs);

      const response = await apiClient.get(
        sloApiPathWithQuery(`internal/observability/slos/${sloId}/_instances`, { size: '2' }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as { results: unknown[]; searchAfter?: unknown };
      expect(body.results).toHaveLength(2);
      expect(body.searchAfter).toBeDefined();
    });

    apiTest('supports pagination with searchAfter', async ({ apiClient, esClient }) => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-1' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-2' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-3' }, now),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-4' }, now),
      ];
      await insertSloSummaryDocs(esClient, docs);

      const firstPage = await apiClient.get(
        sloApiPathWithQuery(`internal/observability/slos/${sloId}/_instances`, { size: '2' }),
        { headers, responseType: 'json' }
      );
      expect(firstPage).toHaveStatusCode(200);
      const fp = firstPage.body as {
        results: Array<{ instanceId: string }>;
        searchAfter?: string;
      };
      expect(fp.results).toHaveLength(2);
      expect(fp.searchAfter).toBeDefined();

      const secondPage = await apiClient.get(
        sloApiPathWithQuery(`internal/observability/slos/${sloId}/_instances`, {
          size: '2',
          searchAfter: fp.searchAfter,
        }),
        { headers, responseType: 'json' }
      );
      expect(secondPage).toHaveStatusCode(200);
      const sp = secondPage.body as { results: Array<{ instanceId: string }> };
      expect(sp.results).toHaveLength(2);

      const firstPageIds = fp.results.map((r) => r.instanceId);
      const secondPageIds = sp.results.map((r) => r.instanceId);
      expect(new Set([...firstPageIds, ...secondPageIds]).size).toBe(4);
    });

    apiTest('only returns instances for the current space', async ({ apiClient, esClient }) => {
      const now = new Date().toISOString();
      const docs = [
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-1' }, now, TEST_SPACE_ID),
        createGroupedSummaryDoc(sloId, [...GROUP_BY], { host: 'instance-2' }, now, 'other-space'),
      ];
      await insertSloSummaryDocs(esClient, docs);

      const response = await apiClient.get(
        sloApiPathWithQuery(`internal/observability/slos/${sloId}/_instances`, {}),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      const body = response.body as { results: Array<{ instanceId: string }> };
      const actualInstances = body.results.filter((r) => r.instanceId !== '*');
      expect(actualInstances).toHaveLength(1);
      expect(actualInstances[0].instanceId).toBe('instance-1');
    });
  }
);
