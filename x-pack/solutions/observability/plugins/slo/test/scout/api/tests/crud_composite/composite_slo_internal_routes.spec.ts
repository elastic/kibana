/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GetCompositeSLOSuggestionsResponse,
  PostCompositeSloSummaryRefreshResponse,
} from '@kbn/slo-schema';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, DEFAULT_COMPOSITE_SLO, mergeSloApiHeaders } from '../../fixtures';

const COMPOSITE_TAG = 'scout-composite-tag';

apiTest.describe(
  'Composite SLO internal routes',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    let compositeId: string;

    apiTest.beforeAll(async ({ requestAuth, apiServices }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
      const createResponse = await apiServices.compositeSlo.create({
        ...DEFAULT_COMPOSITE_SLO,
        tags: [COMPOSITE_TAG],
      });
      expect(createResponse).toHaveStatusCode(200);
      const { id }: { id: string } = createResponse.body;
      compositeId = id;
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.compositeSlo.delete(compositeId);
    });

    apiTest('GET suggestions returns the tags of the composite SLOs', async ({ apiClient }) => {
      const response = await apiClient.get<GetCompositeSLOSuggestionsResponse>(
        'internal/observability/slo_composites/suggestions',
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.tags).toStrictEqual(
        expect.arrayContaining([
          {
            label: COMPOSITE_TAG,
            value: COMPOSITE_TAG,
            count: 1,
          },
        ])
      );
    });

    apiTest('POST _summary_refresh requests a run of the summary task', async ({ apiClient }) => {
      const response = await apiClient.post<PostCompositeSloSummaryRefreshResponse>(
        'internal/observability/slo_composites/_summary_refresh',
        { headers, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(200);
      expect([
        { triggered: true },
        { triggered: false, reason: 'cooldown' },
        { triggered: false, reason: 'already_running' },
        { triggered: false, reason: 'task_not_scheduled' },
      ]).toStrictEqual(expect.arrayContaining([response.body]));
    });
  }
);
