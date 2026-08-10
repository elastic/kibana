/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, mergeSloApiHeaders } from '../fixtures';

const SLO_TEMPLATE_SO_TYPE = 'slo_template';

apiTest.describe(
  'Get SLO Template',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest('returns all valid fields for full template', async ({ apiClient, kbnClient }) => {
      const TEMPLATE_ID = 'full-valid-template-scout';
      await kbnClient.savedObjects.create({
        type: SLO_TEMPLATE_SO_TYPE,
        id: TEMPLATE_ID,
        attributes: {
          name: 'Full Template',
          description: 'A complete SLO template',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'test-index-*',
              filter: 'field: value',
              good: 'status: success',
              total: 'status: *',
              timestampField: '@timestamp',
            },
          },
          budgetingMethod: 'occurrences',
          objective: { target: 0.99 },
          timeWindow: { duration: '7d', type: 'rolling' },
          tags: ['production', 'api'],
          settings: { frequency: '1m', syncDelay: '1m' },
          groupBy: ['host.name', 'service.name'],
          artifacts: { dashboards: [{ id: 'dashboard-1' }, { id: 'dashboard-2' }] },
        },
        overwrite: true,
      });
      try {
        const res = await apiClient.get(`api/observability/slo_templates/${TEMPLATE_ID}`, {
          headers,
          responseType: 'json',
        });
        expect(res).toHaveStatusCode(200);
        const template = res.body as Record<string, unknown>;
        expect(template.templateId).toBe(TEMPLATE_ID);
        expect(template.name).toBe('Full Template');
        expect(template.indicator).toStrictEqual({
          type: 'sli.kql.custom',
          params: {
            index: 'test-index-*',
            filter: 'field: value',
            good: 'status: success',
            total: 'status: *',
            timestampField: '@timestamp',
          },
        });
      } finally {
        await kbnClient.savedObjects.delete({ type: SLO_TEMPLATE_SO_TYPE, id: TEMPLATE_ID });
      }
    });

    apiTest('returns 404 when template does not exist', async ({ apiClient }) => {
      const res = await apiClient.get(
        'api/observability/slo_templates/non-existent-template-id-scout',
        {
          headers,
          responseType: 'json',
        }
      );
      expect(res).toHaveStatusCode(404);
      const body = res.body as { message?: string };
      expect(body.message).toContain(
        'SLO Template with id [non-existent-template-id-scout] not found'
      );
    });
  }
);
