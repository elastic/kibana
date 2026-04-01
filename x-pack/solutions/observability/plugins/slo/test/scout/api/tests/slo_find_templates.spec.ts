/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, mergeSloApiHeaders, sloApiPathWithQuery } from '../fixtures';

const SLO_TEMPLATE_SO_TYPE = 'slo_template';

apiTest.describe(
  'Find SLO Templates',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest('returns templates with default pagination', async ({ apiClient, kbnClient }) => {
      const id = `scout-find-tpl-default-${Date.now()}`;
      await kbnClient.savedObjects.create({
        type: SLO_TEMPLATE_SO_TYPE,
        id,
        attributes: { name: 'Scout Default Pagination', tags: ['scout-find'] },
        overwrite: true,
      });
      try {
        const response = await apiClient.get(
          sloApiPathWithQuery('api/observability/slo_templates', {}),
          { headers, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        const body = response.body as {
          page: number;
          perPage: number;
          total: number;
          results: unknown[];
        };
        expect(body.page).toBe(1);
        expect(body.perPage).toBe(20);
        expect(body.total).toBeGreaterThan(0);
        expect(Array.isArray(body.results)).toBe(true);
      } finally {
        await kbnClient.savedObjects.delete({ type: SLO_TEMPLATE_SO_TYPE, id });
      }
    });

    apiTest('returns error when page is zero', async ({ apiClient }) => {
      const response = await apiClient.get(
        sloApiPathWithQuery('api/observability/slo_templates', { page: 0 }),
        { headers, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(400);
      expect((response.body as { message: string }).message).toContain(
        'page must be a positive integer'
      );
    });
  }
);
