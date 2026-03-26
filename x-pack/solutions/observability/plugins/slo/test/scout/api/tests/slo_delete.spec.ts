/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  SLI_DESTINATION_INDEX_PATTERN,
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getCustomSLOPipelineId,
  getCustomSLOSummaryPipelineId,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardPipelineId,
} from '../../../../common/constants';
import {
  apiTest,
  createSloPipelineAssertions,
  createSloTransformAssertions,
  DEFAULT_SLO,
  mergeSloApiHeaders,
  pollUntilTrue,
  type SloPipelineAssertions,
  type SloTransformAssertions,
} from '../fixtures';

apiTest.describe(
  'Delete SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let transformHelper: SloTransformAssertions;
    let pipelineHelper: SloPipelineAssertions;

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth, requestAuth, sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      transformHelper = createSloTransformAssertions(apiClient, esClient, async () =>
        samlAuth.session.getApiCredentialsForRole('admin')
      );
      pipelineHelper = createSloPipelineAssertions(esClient);
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('deletes SLO and related resources', async ({ apiClient, esClient }) => {
      const response = await apiClient.post('api/observability/slos', {
        headers,
        body: DEFAULT_SLO,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const id = response.body.id as string;

      const del = await apiClient.delete(`api/observability/slos/${id}`, {
        headers,
        responseType: 'json',
      });
      expect(del).toHaveStatusCode(204);

      const definitions = await apiClient.get('api/observability/slos/_definitions', {
        headers,
        responseType: 'json',
      });
      expect(definitions).toHaveStatusCode(200);
      expect((definitions.body as { total: number }).total).toBe(0);

      await transformHelper.assertNotFound(getSLOTransformId(id, 1));
      await transformHelper.assertNotFound(getSLOSummaryTransformId(id, 1));
      await pipelineHelper.assertNotFound(getWildcardPipelineId(id, 1));

      await pollUntilTrue(
        async () => {
          const sloSummaryResponseAfterDeletion = await esClient.search({
            index: SUMMARY_DESTINATION_INDEX_PATTERN,
            query: {
              bool: {
                filter: [{ term: { 'slo.id': id } }, { term: { isTempDoc: false } }],
              },
            },
          });
          return sloSummaryResponseAfterDeletion.hits.hits.length === 0;
        },
        { timeoutMs: 60_000, intervalMs: 2000, label: 'SLO summary data deleted' }
      );

      await pollUntilTrue(
        async () => {
          const sloRollupResponseAfterDeletion = await esClient.search({
            index: SLI_DESTINATION_INDEX_PATTERN,
            query: {
              bool: {
                filter: [{ term: { 'slo.id': id } }],
              },
            },
          });
          return sloRollupResponseAfterDeletion.hits.hits.length <= 1;
        },
        { timeoutMs: 60_000, intervalMs: 2000, label: 'SLO rollup data deleted' }
      );
    });

    apiTest('deletes custom pipelines when deleting SLO', async ({ apiClient, esClient }) => {
      const response = await apiClient.post('api/observability/slos', {
        headers,
        body: DEFAULT_SLO,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const id = response.body.id as string;

      const customSLOPipelineId = getCustomSLOPipelineId(id);
      const customSLOSummaryPipelineId = getCustomSLOSummaryPipelineId(id);

      await esClient.ingest.putPipeline({
        id: customSLOPipelineId,
        processors: [{ set: { field: 'custom.test', value: 'rollup custom works!' } }],
      });

      await esClient.ingest.putPipeline({
        id: customSLOSummaryPipelineId,
        processors: [{ set: { field: 'custom.summary_test', value: 'summary custom works!' } }],
      });

      await pipelineHelper.assertExists(customSLOPipelineId);
      await pipelineHelper.assertExists(customSLOSummaryPipelineId);

      const del = await apiClient.delete(`api/observability/slos/${id}`, {
        headers,
        responseType: 'json',
      });
      expect(del).toHaveStatusCode(204);

      await pipelineHelper.assertNotFound(customSLOPipelineId);
      await pipelineHelper.assertNotFound(customSLOSummaryPipelineId);
    });
  }
);
