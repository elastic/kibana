/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../fixtures';
import {
  ANNOTATIONS_API_PATH,
  ANNOTATIONS_INDEX_NAME,
  PUBLIC_HEADERS,
} from '../fixtures/constants';

interface FoundAnnotation {
  slo: { id: string; instanceId: string };
}

interface FindAnnotationsResponse {
  items: FoundAnnotation[];
}

apiTest.describe(
  'Observability find annotations API',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    const createSloAnnotation = async (
      apiClient: ApiClientFixture,
      slo: { id: string; instanceId: string }
    ) => {
      const response = await apiClient.post(ANNOTATIONS_API_PATH, {
        headers,
        body: {
          annotation: { type: 'slo' },
          '@timestamp': moment().subtract(1, 'day').toISOString(),
          message: 'test message',
          tags: ['apm'],
          slo,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
    };

    const findAnnotations = async (
      apiClient: ApiClientFixture,
      params?: { sloId?: string; sloInstanceId?: string }
    ) => {
      const queryParams = new URLSearchParams();
      if (params?.sloId) {
        queryParams.set('sloId', params.sloId);
      }
      if (params?.sloInstanceId) {
        queryParams.set('sloInstanceId', params.sloInstanceId);
      }

      const query = queryParams.toString();
      const response = await apiClient.get(
        `${ANNOTATIONS_API_PATH}/find${query ? `?${query}` : ''}`,
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      return response.body as FindAnnotationsResponse;
    };

    apiTest.beforeAll(async ({ requestAuth, esClient, apiClient }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKeyForAdmin();
      headers = { ...PUBLIC_HEADERS, ...adminApiKey.apiKeyHeader };

      const indexExists = await esClient.indices.exists({ index: ANNOTATIONS_INDEX_NAME });
      if (indexExists) {
        await esClient.indices.delete({ index: ANNOTATIONS_INDEX_NAME });
      }

      await createSloAnnotation(apiClient, { id: 'slo-id', instanceId: 'instance-id' });
      await createSloAnnotation(apiClient, { id: 'slo-id2', instanceId: 'instance-id' });
    });

    apiTest.afterAll(async ({ esClient }) => {
      const indexExists = await esClient.indices.exists({ index: ANNOTATIONS_INDEX_NAME });
      if (indexExists) {
        await esClient.indices.delete({ index: ANNOTATIONS_INDEX_NAME });
      }
    });

    apiTest('can find annotations filtered by slo id', async ({ apiClient }) => {
      const all = await findAnnotations(apiClient);
      expect(all.items).toHaveLength(2);
      expect(all.items[0].slo.id).toBe('slo-id2');

      const filtered = await findAnnotations(apiClient, { sloId: 'slo-id' });
      expect(filtered.items).toHaveLength(1);
      expect(filtered.items[0].slo.id).toBe('slo-id');
    });

    apiTest('can find annotations filtered by slo instance id', async ({ apiClient }) => {
      const response = await findAnnotations(apiClient, { sloInstanceId: 'instance-id' });
      expect(response.items).toHaveLength(2);
      expect(response.items[0].slo.instanceId).toBe('instance-id');
    });

    apiTest(
      'can find annotations filtered by slo instance id and slo id',
      async ({ apiClient }) => {
        const response = await findAnnotations(apiClient, {
          sloInstanceId: 'instance-id',
          sloId: 'slo-id',
        });
        expect(response.items).toHaveLength(1);
        expect(response.items[0].slo.instanceId).toBe('instance-id');
        expect(response.items[0].slo.id).toBe('slo-id');
      }
    );
  }
);
