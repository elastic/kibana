/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_SLO, mergeSloApiHeaders } from '../../fixtures';

apiTest.describe(
  'Get SLOs',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.setup();
    });

    apiTest.afterAll(async ({ sloHostsDataForge }) => {
      await sloHostsDataForge.teardown();
    });

    apiTest('get SLO by id', async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      const headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const createRes1 = await apiClient.post('api/observability/slos', {
        headers,
        body: DEFAULT_SLO,
        responseType: 'json',
      });
      expect(createRes1).toHaveStatusCode(200);
      const createRes2 = await apiClient.post('api/observability/slos', {
        headers,
        body: {
          ...DEFAULT_SLO,
          name: 'something irrelevant foo',
        },
        responseType: 'json',
      });
      expect(createRes2).toHaveStatusCode(200);

      const sloId1 = createRes1.body.id as string;

      const getSloResponse = await apiClient.get(`api/observability/slos/${sloId1}`, {
        headers,
        responseType: 'json',
      });
      expect(getSloResponse).toHaveStatusCode(200);
      const body = getSloResponse.body as Record<string, unknown>;
      expect(body.summary).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.instanceId).toBeDefined();
      expect(body.budgetingMethod).toBe('occurrences');
      expect(body.timeWindow).toStrictEqual({ duration: '7d', type: 'rolling' });
    });
  }
);
