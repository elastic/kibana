/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { SLO_MODEL_VERSION, getSLOPipelineId } from '../../../../common/constants';
import { apiTest, DEFAULT_SLO, mergeSloApiHeaders, pollUntilTrue } from '../fixtures';

apiTest.describe(
  'Reset SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('resets the related resources', async ({ apiClient, requestAuth, esClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      const headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const createResponse = await apiClient.post('api/observability/slos', {
        headers,
        body: DEFAULT_SLO,
        responseType: 'json',
      });
      expect(createResponse).toHaveStatusCode(200);
      const sloId = createResponse.body.id as string;

      await pollUntilTrue(
        async () => {
          try {
            await esClient.ingest.deletePipeline({ id: getSLOPipelineId(sloId, 1) });
            return true;
          } catch {
            return false;
          }
        },
        { timeoutMs: 60_000, intervalMs: 2000 }
      );

      const resetResponse = await apiClient.post(`api/observability/slos/${sloId}/_reset`, {
        headers,
        responseType: 'json',
      });
      expect(resetResponse).toHaveStatusCode(200);
      expect(resetResponse.body).toMatchObject({ version: SLO_MODEL_VERSION, revision: 2 });

      await pollUntilTrue(
        async () => {
          try {
            const pipelineId = getSLOPipelineId(sloId, 2);
            const response = await esClient.ingest.getPipeline({ id: pipelineId });
            return Boolean(response[pipelineId]);
          } catch {
            return false;
          }
        },
        { timeoutMs: 60_000, intervalMs: 2000 }
      );
    });
  }
);
