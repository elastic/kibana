/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
  validateLogEntryDatasetsRequestPayloadRT,
  validateLogEntryDatasetsResponsePayloadRT,
} from '../../../../common/http_api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'API /infra/log_analysis/validation/log_entry_datasets',
  { tag: [...tags.stateful.all, ...tags.serverless.observability.complete] },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGS_AND_METRICS_8_0_0);
    });

    apiTest('works', async ({ apiClient }) => {
      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_DATASETS_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: validateLogEntryDatasetsRequestPayloadRT.encode({
          data: {
            endTime: testData.DATES['8.0.0'].logs_and_metrics.max,
            indices: ['filebeat-*'],
            startTime: testData.DATES['8.0.0'].logs_and_metrics.min,
            timestampField: '@timestamp',
            runtimeMappings: {},
          },
        }),
      });

      expect(response).toHaveStatusCode(200);

      const {
        data: { datasets },
      } = decodeOrThrow(validateLogEntryDatasetsResponsePayloadRT)(response.body);

      expect(datasets).toHaveLength(1);
      expect(datasets[0].indexName).toBe('filebeat-*');
      expect(datasets[0].datasets).toStrictEqual([
        'elasticsearch.gc',
        'elasticsearch.server',
        'kibana.log',
        'nginx.access',
      ]);
    });

    apiTest('deduplicates repeated indices', async ({ apiClient }) => {
      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_DATASETS_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: validateLogEntryDatasetsRequestPayloadRT.encode({
          data: {
            endTime: testData.DATES['8.0.0'].logs_and_metrics.max,
            indices: ['filebeat-*', 'filebeat-*'],
            startTime: testData.DATES['8.0.0'].logs_and_metrics.min,
            timestampField: '@timestamp',
            runtimeMappings: {},
          },
        }),
      });

      expect(response).toHaveStatusCode(200);

      const {
        data: { datasets },
      } = decodeOrThrow(validateLogEntryDatasetsResponsePayloadRT)(response.body);

      expect(datasets).toHaveLength(1);
      expect(datasets[0].indexName).toBe('filebeat-*');
      expect(datasets[0].datasets).toStrictEqual([
        'elasticsearch.gc',
        'elasticsearch.server',
        'kibana.log',
        'nginx.access',
      ]);
    });

    apiTest('rejects requests with too many indices', async ({ apiClient }) => {
      const indices = Array.from({ length: 1001 }, (_, index) => `filebeat-${index}-*`);

      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_DATASETS_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: {
          data: {
            endTime: testData.DATES['8.0.0'].logs_and_metrics.max,
            indices,
            startTime: testData.DATES['8.0.0'].logs_and_metrics.min,
            timestampField: '@timestamp',
            runtimeMappings: {},
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect((response.body as { message: string }).message).toContain('out of bounds');
    });
  }
);
