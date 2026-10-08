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
  LOG_ANALYSIS_VALIDATE_INDICES_PATH,
  validationIndicesRequestPayloadRT,
  validationIndicesResponsePayloadRT,
} from '../../../../common/http_api';
import { apiTest, testData } from '../fixtures';

const TIMESTAMP_FIELD = {
  name: '@timestamp',
  validTypes: ['date', 'date_nanos'],
};

apiTest.describe(
  'API /infra/log_analysis/validation/log_entry_rate_indices',
  { tag: tags.stateful.all },
  () => {
    let viewerApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, esArchiver }) => {
      viewerApiCredentials = await requestAuth.getApiKey('viewer');
      await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.logsAndMetrics);
    });

    apiTest('works', async ({ apiClient }) => {
      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: validationIndicesRequestPayloadRT.encode({
          data: {
            fields: [TIMESTAMP_FIELD],
            indices: ['filebeat-*'],
            runtimeMappings: {},
          },
        }),
      });

      expect(response).toHaveStatusCode(200);

      const {
        data: { errors },
      } = decodeOrThrow(validationIndicesResponsePayloadRT)(response.body);

      expect(errors).toStrictEqual([]);
    });

    apiTest(
      'deduplicates fields with identical specifications without multiplying errors',
      async ({ apiClient }) => {
        const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
          headers: {
            ...viewerApiCredentials.apiKeyHeader,
            ...testData.INTERNAL_HEADERS,
          },
          responseType: 'json',
          body: validationIndicesRequestPayloadRT.encode({
            data: {
              fields: [TIMESTAMP_FIELD, TIMESTAMP_FIELD],
              indices: ['filebeat-*'],
              runtimeMappings: {},
            },
          }),
        });

        expect(response).toHaveStatusCode(200);

        const {
          data: { errors },
        } = decodeOrThrow(validationIndicesResponsePayloadRT)(response.body);

        expect(errors).toStrictEqual([]);
      }
    );

    apiTest(
      'rejects requests with duplicate field names that have conflicting specifications',
      async ({ apiClient }) => {
        const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
          headers: {
            ...viewerApiCredentials.apiKeyHeader,
            ...testData.INTERNAL_HEADERS,
          },
          responseType: 'json',
          body: validationIndicesRequestPayloadRT.encode({
            data: {
              fields: [
                { name: '@timestamp', validTypes: ['date'] },
                { name: '@timestamp', validTypes: ['date_nanos'] },
              ],
              indices: ['filebeat-*'],
              runtimeMappings: {},
            },
          }),
        });

        expect(response).toHaveStatusCode(400);
        expect((response.body as { message: string }).message).toContain('conflicting valid types');
      }
    );

    apiTest('returns errors in a deterministic order', async ({ apiClient }) => {
      // Use several non-existent index patterns so each produces an
      // `INDEX_NOT_FOUND` error. The response errors must follow the input
      // index order regardless of the concurrent query completion order.
      const indices = Array.from({ length: 25 }, (_, index) => `missing-index-${index}-*`);

      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: validationIndicesRequestPayloadRT.encode({
          data: {
            fields: [TIMESTAMP_FIELD],
            indices,
            runtimeMappings: {},
          },
        }),
      });

      expect(response).toHaveStatusCode(200);

      const {
        data: { errors },
      } = decodeOrThrow(validationIndicesResponsePayloadRT)(response.body);

      expect(errors).toStrictEqual(
        indices.map((index) => ({
          error: 'INDEX_NOT_FOUND',
          index,
        }))
      );
    });

    apiTest('rejects requests with too many indices', async ({ apiClient }) => {
      const indices = Array.from({ length: 1001 }, (_, index) => `filebeat-${index}-*`);

      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: {
          data: {
            fields: [TIMESTAMP_FIELD],
            indices,
            runtimeMappings: {},
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect((response.body as { message: string }).message).toContain('out of bounds');
    });

    apiTest('rejects requests with too many fields', async ({ apiClient }) => {
      const fields = Array.from({ length: 101 }, (_, index) => ({
        name: `field-${index}`,
        validTypes: ['keyword'],
      }));

      const response = await apiClient.post(LOG_ANALYSIS_VALIDATE_INDICES_PATH, {
        headers: {
          ...viewerApiCredentials.apiKeyHeader,
          ...testData.INTERNAL_HEADERS,
        },
        responseType: 'json',
        body: {
          data: {
            fields,
            indices: ['filebeat-*'],
            runtimeMappings: {},
          },
        },
      });

      expect(response).toHaveStatusCode(400);
      expect((response.body as { message: string }).message).toContain('out of bounds');
    });
  }
);
