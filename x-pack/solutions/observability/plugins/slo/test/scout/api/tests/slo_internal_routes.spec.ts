/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import type {
  CreateSLOResponse,
  FetchSLOHealthResponse,
  FindSLOGroupsResponse,
  GetPreviewDataResponse,
  GetSLOSuggestionsResponse,
} from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  cleanupSloSummaryDocs,
  createDummySummaryDoc,
  DEFAULT_SLO,
  insertSloSummaryDocs,
  mergeSloApiHeaders,
  sloApiPathWithQuery,
  TEST_SPACE_ID,
} from '../fixtures';

const PREVIEW_SOURCE_INDEX = 'slo-scout-api-preview-source';
const SUGGESTION_TAG = 'scout-suggestion-tag';
const GROUPS_TAG = 'scout-groups-tag';
const MINUTE_MS = 60 * 1000;

interface DiagnosisResponse {
  licenseAndFeatures: { license?: { status: string } };
  userPrivileges: { read: SecurityHasPrivilegesResponse; write: SecurityHasPrivilegesResponse };
}

apiTest.describe(
  'SLO internal routes',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let sloId: string;

    apiTest.beforeAll(async ({ requestAuth, apiServices, esClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const now = Date.now();
      const [createResponse] = await Promise.all([
        apiServices.slo.create({ ...DEFAULT_SLO, tags: [SUGGESTION_TAG] }),
        esClient.indices
          .delete({ index: PREVIEW_SOURCE_INDEX, ignore_unavailable: true })
          .then(() =>
            esClient.indices.create({
              index: PREVIEW_SOURCE_INDEX,
              mappings: {
                properties: { '@timestamp': { type: 'date' }, status: { type: 'keyword' } },
              },
            })
          )
          .then(() =>
            esClient.bulk({
              refresh: true,
              operations: Array.from({ length: 10 }, (_, i) => [
                { index: { _index: PREVIEW_SOURCE_INDEX } },
                {
                  '@timestamp': new Date(now - (10 + i * 4) * MINUTE_MS).toISOString(),
                  status: i === 0 ? 'error' : 'ok',
                },
              ]).flat(),
            })
          ),
      ]);
      expect(createResponse).toHaveStatusCode(200);
      const { id }: CreateSLOResponse = createResponse.body;
      sloId = id;
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await Promise.all([
        apiServices.slo.delete(sloId),
        esClient.indices.delete({ index: PREVIEW_SOURCE_INDEX, ignore_unavailable: true }),
        cleanupSloSummaryDocs(esClient, { term: { 'slo.tags': GROUPS_TAG } }),
      ]);
    });

    apiTest(
      'POST _inspect returns the generated resources without persisting the SLO',
      async ({ apiClient }) => {
        const response = await apiClient.post('internal/observability/slos/_inspect', {
          headers,
          body: DEFAULT_SLO,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(Object.keys(response.body).sort()).toStrictEqual([
          'rollUpPipeline',
          'rollUpTransform',
          'rollUpTransformCompositeQuery',
          'slo',
          'summaryPipeline',
          'summaryTransform',
          'summaryTransformCompositeQuery',
          'temporaryDoc',
        ]);
        const { id: inspectedId }: { id: string } = response.body.slo;
        expect(response.body.slo.name).toBe(DEFAULT_SLO.name);

        const getResponse = await apiClient.get(`api/observability/slos/${inspectedId}`, {
          headers,
          responseType: 'json',
        });
        expect(getResponse).toHaveStatusCode(404);
      }
    );

    apiTest('POST _preview computes the SLI from the source data', async ({ apiClient }) => {
      const now = Date.now();
      const response = await apiClient.post<GetPreviewDataResponse>(
        'internal/observability/slos/_preview',
        {
          headers,
          body: {
            indicator: {
              type: 'sli.kql.custom',
              params: {
                index: PREVIEW_SOURCE_INDEX,
                filter: '',
                good: 'status: ok',
                total: 'status: *',
                timestampField: '@timestamp',
              },
            },
            range: {
              from: new Date(now - 60 * MINUTE_MS).toISOString(),
              to: new Date(now).toISOString(),
            },
          },
          responseType: 'json',
        }
      );

      expect(response).toHaveStatusCode(200);
      const { results } = response.body;
      expect(results.length).toBeGreaterThan(0);
      const totals = results.reduce(
        (acc, { events }) => ({
          good: acc.good + (events?.good ?? 0),
          total: acc.total + (events?.total ?? 0),
        }),
        { good: 0, total: 0 }
      );
      expect(totals).toStrictEqual({ good: 9, total: 10 });
    });

    apiTest(
      'GET _groups groups the SLO summaries by the requested field',
      async ({ apiClient, esClient }) => {
        const now = new Date().toISOString();
        await insertSloSummaryDocs(esClient, [
          createDummySummaryDoc(v4(), '*', now, TEST_SPACE_ID, { tags: [GROUPS_TAG] }),
          createDummySummaryDoc(v4(), '*', now, TEST_SPACE_ID, { tags: [GROUPS_TAG] }),
        ]);

        const response = await apiClient.get<FindSLOGroupsResponse>(
          sloApiPathWithQuery('internal/observability/slos/_groups', {
            groupBy: 'slo.tags',
            kqlQuery: `slo.tags: "${GROUPS_TAG}"`,
          }),
          { headers, responseType: 'json' }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body.results).toHaveLength(1);
        const [group] = response.body.results;
        expect(group.group).toBe(GROUPS_TAG);
        expect(group.groupBy).toBe('slo.tags');
        expect(group.summary.total).toBe(2);
      }
    );

    apiTest('GET suggestions returns the tags of the SLO definitions', async ({ apiClient }) => {
      const response = await apiClient.get<GetSLOSuggestionsResponse>(
        'internal/observability/slos/suggestions',
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(
        expect.arrayContaining([
          {
            label: SUGGESTION_TAG,
            value: SUGGESTION_TAG,
            count: 1,
          },
        ])
      );
    });

    apiTest('GET _diagnosis returns the license and the user privileges', async ({ apiClient }) => {
      const response = await apiClient.get<DiagnosisResponse>(
        'internal/observability/slos/_diagnosis',
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.licenseAndFeatures.license?.status).toBe('active');
      expect(response.body.userPrivileges.read.has_all_requested).toBe(true);
      expect(typeof response.body.userPrivileges.write.has_all_requested).toBe('boolean');
    });

    apiTest(
      'POST _health returns the transform health of the existing SLOs only',
      async ({ apiClient }) => {
        const response = await apiClient.post<FetchSLOHealthResponse>(
          'internal/observability/slos/_health',
          {
            headers,
            body: {
              list: [
                { id: sloId, instanceId: '*' },
                { id: 'unknown-slo-id', instanceId: '*' },
              ],
            },
            responseType: 'json',
          }
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual([
          expect.objectContaining({
            id: sloId,
            revision: 1,
            name: DEFAULT_SLO.name,
            health: expect.objectContaining({
              rollup: expect.objectContaining({ missing: false }),
              summary: expect.objectContaining({ missing: false }),
            }),
          }),
        ]);
      }
    );
  }
);
