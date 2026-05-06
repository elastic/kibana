/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, SIEM_READINESS_ROUTES, SIEM_READINESS_TAGS } from '../../fixtures';

interface PipelineStats {
  name: string;
  indices: string[];
  docsCount: number;
  failedDocsCount: number;
  statsAvailable: boolean;
}

type PipelinesResponse = PipelineStats[];

/**
 * SIEM Readiness API Tests: Pipelines Endpoint
 *
 * Tests for GET /api/siem_readiness/get_pipelines
 * This endpoint returns ingest pipeline statistics,
 * used by the Continuity tab to show pipeline health.
 */
apiTest.describe('SIEM Readiness - Pipelines API', { tag: SIEM_READINESS_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
  });

  apiTest('returns 200 with expected response structure', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_PIPELINES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    // Response must be an array
    expect(Array.isArray(response.body)).toBe(true);
  });

  apiTest('pipeline stats have required fields', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_PIPELINES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as PipelinesResponse;

    // Each pipeline stat should have expected structure
    body.forEach((pipeline: PipelineStats) => {
      // name is required
      expect(pipeline.name).toBeDefined();
      expect(typeof pipeline.name).toBe('string');

      // indices is required and must be an array
      expect(pipeline.indices).toBeDefined();
      expect(Array.isArray(pipeline.indices)).toBe(true);
      pipeline.indices.forEach((index: string) => {
        expect(typeof index).toBe('string');
      });

      // docsCount is required
      expect(pipeline.docsCount).toBeDefined();
      expect(typeof pipeline.docsCount).toBe('number');
      expect(pipeline.docsCount).toBeGreaterThanOrEqual(0);

      // failedDocsCount is required
      expect(pipeline.failedDocsCount).toBeDefined();
      expect(typeof pipeline.failedDocsCount).toBe('number');
      expect(pipeline.failedDocsCount).toBeGreaterThanOrEqual(0);

      // statsAvailable indicates if ingest stats are available
      expect(pipeline.statsAvailable).toBeDefined();
      expect(typeof pipeline.statsAvailable).toBe('boolean');
    });
  });

  apiTest('failed docs count is not greater than total docs count', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_PIPELINES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as PipelinesResponse;

    // failedDocsCount should never exceed docsCount
    body.forEach((pipeline: PipelineStats) => {
      if (pipeline.statsAvailable) {
        expect(pipeline.failedDocsCount).toBeLessThanOrEqual(pipeline.docsCount);
      }
    });
  });

  apiTest('pipeline names are non-empty strings', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_PIPELINES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as PipelinesResponse;

    body.forEach((pipeline: PipelineStats) => {
      expect(pipeline.name.length).toBeGreaterThan(0);
    });
  });

  apiTest('indices array contains valid index patterns', async ({ apiClient }) => {
    const response = await apiClient.get(SIEM_READINESS_ROUTES.GET_PIPELINES, {
      headers: defaultHeaders,
      responseType: 'json',
    });

    expect(response.statusCode).toBe(200);

    const body = response.body as PipelinesResponse;

    body.forEach((pipeline: PipelineStats) => {
      // Each index should be a non-empty string
      pipeline.indices.forEach((index: string) => {
        expect(index.length).toBeGreaterThan(0);
      });
    });
  });
});
