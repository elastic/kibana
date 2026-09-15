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
  createGroupedSummaryDoc,
  insertSloSummaryDocs,
  mergeSloApiHeaders,
  sloApiPathWithQuery,
} from '../fixtures';

interface OverviewResponse {
  healthy: number;
  violated: number;
}

apiTest.describe(
  'SLO cluster-level filters (#198289)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest.afterEach(async ({ esClient }) => {
      await cleanupSloSummaryDocs(esClient);
    });

    apiTest(
      'filters SLOs by slo.groupings.* fields (client rewrites field names before sending)',
      async ({ apiClient, esClient }) => {
        const now = new Date().toISOString();
        await insertSloSummaryDocs(esClient, [
          createGroupedSummaryDoc(
            'slo-cluster-a',
            ['orchestrator.cluster.name'],
            { 'orchestrator.cluster.name': 'prod-cluster-a' },
            now
          ),
          createGroupedSummaryDoc(
            'slo-cluster-b',
            ['orchestrator.cluster.name'],
            { 'orchestrator.cluster.name': 'prod-cluster-b' },
            now
          ),
          createGroupedSummaryDoc(
            'slo-k8s',
            ['k8s.cluster.name'],
            { 'k8s.cluster.name': 'k8s-staging' },
            now
          ),
          createGroupedSummaryDoc(
            'slo-violated',
            ['orchestrator.cluster.name'],
            { 'orchestrator.cluster.name': 'prod-cluster-a' },
            now,
            { status: 'VIOLATED' }
          ),
        ]);

        const fetchOverview = async (filters?: string) => {
          const path = sloApiPathWithQuery('internal/observability/slos/overview', {
            ...(filters ? { filters } : {}),
          });
          const response = await apiClient.get(path, { headers, responseType: 'json' });
          expect(response).toHaveStatusCode(200);
          return response.body as OverviewResponse;
        };

        const baseline = await fetchOverview();
        expect(baseline.healthy).toBe(3);
        expect(baseline.violated).toBe(1);

        const matchPhraseFilter = JSON.stringify({
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      'slo.groupings.orchestrator.cluster.name': 'prod-cluster-a',
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must_not: [],
        });
        const matchPhraseResult = await fetchOverview(matchPhraseFilter);
        expect(matchPhraseResult.healthy).toBe(1);
        expect(matchPhraseResult.violated).toBe(1);

        const termFilter = JSON.stringify({
          filter: [{ term: { 'slo.groupings.orchestrator.cluster.name': 'prod-cluster-b' } }],
          must_not: [],
        });
        const termResult = await fetchOverview(termFilter);
        expect(termResult.healthy).toBe(1);
        expect(termResult.violated).toBe(0);

        const k8sFilter = JSON.stringify({
          filter: [
            {
              bool: {
                should: [{ match_phrase: { 'slo.groupings.k8s.cluster.name': 'k8s-staging' } }],
                minimum_should_match: 1,
              },
            },
          ],
          must_not: [],
        });
        const k8sResult = await fetchOverview(k8sFilter);
        expect(k8sResult.healthy).toBe(1);

        const mustNotFilter = JSON.stringify({
          filter: [],
          must_not: [
            {
              match_phrase: {
                'slo.groupings.orchestrator.cluster.name': 'prod-cluster-a',
              },
            },
          ],
        });
        const mustNotResult = await fetchOverview(mustNotFilter);
        expect(mustNotResult.healthy).toBe(2);
        expect(mustNotResult.violated).toBe(0);

        const statusFilter = JSON.stringify({
          filter: [{ term: { status: 'VIOLATED' } }],
          must_not: [],
        });
        const statusResult = await fetchOverview(statusFilter);
        expect(statusResult.violated).toBe(1);
        expect(statusResult.healthy).toBe(0);
      }
    );
  }
);
