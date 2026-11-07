/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOResponse, GetSLOResponse } from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_SLO, mergeSloApiHeaders } from '../fixtures';

apiTest.describe(
  'Enable SLO',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let sloId: string;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      const createResponse = await apiServices.slo.create(DEFAULT_SLO);
      expect(createResponse).toHaveStatusCode(200);
      const { id }: CreateSLOResponse = createResponse.body;
      sloId = id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.slo.delete(sloId);
    });

    apiTest('POST /{id}/enable enables a disabled SLO', async ({ apiClient }) => {
      const disableResponse = await apiClient.post(`api/observability/slos/${sloId}/disable`, {
        headers,
        responseType: 'json',
      });
      expect(disableResponse).toHaveStatusCode(204);

      const enableResponse = await apiClient.post(`api/observability/slos/${sloId}/enable`, {
        headers,
        responseType: 'json',
      });
      expect(enableResponse).toHaveStatusCode(204);

      const getResponse = await apiClient.get<GetSLOResponse>(`api/observability/slos/${sloId}`, {
        headers,
        responseType: 'json',
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.enabled).toBe(true);
    });
  }
);
