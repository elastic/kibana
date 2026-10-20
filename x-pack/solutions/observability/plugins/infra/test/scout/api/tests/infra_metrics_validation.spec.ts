/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { GetInfraMetricsRequestBodyPayloadClient } from '../../../../common/http_api/infra';
import { apiTest, testData } from '../fixtures';

const basePayload: GetInfraMetricsRequestBodyPayloadClient = {
  limit: 10,
  metrics: [
    'cpu',
    'cpuV2',
    'diskSpaceUsage',
    'memory',
    'memoryFree',
    'normalizedLoad1m',
    'rx',
    'tx',
  ],
  from: new Date(testData.DATES['8.0.0'].logs_and_metrics.min).toISOString(),
  to: new Date(testData.DATES['8.0.0'].logs_and_metrics.max).toISOString(),
  query: { bool: { must_not: [], filter: [], should: [], must: [] } },
  schema: 'ecs',
};

apiTest.describe(
  'API /api/metrics/infra/host (validations)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const adminApiKey: RoleApiCredentials = await requestAuth.getApiKey('admin');
      headers = { ...adminApiKey.apiKeyHeader, ...testData.COMMON_HEADERS };
    });

    apiTest('fails when limit is 0', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 0 };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        '[request body]: Failed to validate: in limit: 0 does not match expected type InRange in limit: 0 does not match expected type pipe(undefined, BooleanFromString)'
      );
    });

    apiTest('fails when limit is negative', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: -2 };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        '[request body]: Failed to validate: in limit: -2 does not match expected type InRange in limit: -2 does not match expected type pipe(undefined, BooleanFromString)'
      );
    });

    apiTest('fails when limit above 500', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 501 };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        '[request body]: Failed to validate: in limit: 501 does not match expected type InRange in limit: 501 does not match expected type pipe(undefined, BooleanFromString)'
      );
    });

    apiTest('fails when metric is invalid', async ({ apiClient }) => {
      const invalidBody = { ...basePayload, metrics: ['any'] };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body: invalidBody,
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        '[request body]: Failed to validate: in metrics/0: "any" does not match expected type "cpu" | "cpuV2" | "normalizedLoad1m" | "diskSpaceUsage" | "memory" | "memoryFree" | "rx" | "tx" | "rxV2" | "txV2"'
      );
    });

    apiTest('passes when limit is 1', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 1 };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('passes when limit is 500', async ({ apiClient }) => {
      const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 500 };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body,
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest('fails when from and to are not informed', async ({ apiClient }) => {
      const invalidBody = { ...basePayload, from: undefined, to: undefined };
      const response = await apiClient.post('api/metrics/infra/host', {
        headers,
        responseType: 'json',
        body: invalidBody,
      });

      expect(response).toHaveStatusCode(400);
      expect(testData.normalizeNewLine((response.body as { message: string }).message)).toBe(
        '[request body]: Failed to validate: in from: undefined does not match expected type isoToEpochRt in to: undefined does not match expected type isoToEpochRt'
      );
    });
  }
);
