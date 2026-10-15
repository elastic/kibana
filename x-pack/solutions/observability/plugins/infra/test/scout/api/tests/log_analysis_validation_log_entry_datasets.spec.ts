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
  { tag: tags.stateful.all },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logsAndMetrics);
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
            endTime: Date.now().valueOf(),
            indices: ['filebeat-*'],
            startTime: 1562766600672,
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
            endTime: Date.now().valueOf(),
            indices: ['filebeat-*', 'filebeat-*'],
            startTime: 1562766600672,
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
            endTime: Date.now().valueOf(),
            indices,
            startTime: 1562766600672,
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
