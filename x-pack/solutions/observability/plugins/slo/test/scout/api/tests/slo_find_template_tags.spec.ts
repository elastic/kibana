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
  'Find SLO Template Tags',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };
    });

    apiTest('returns unique tags sorted alphabetically', async ({ apiClient, kbnClient }) => {
      const TEMPLATE_IDS = [
        `scout-tags-alpha-${Date.now()}`,
        `scout-tags-bravo-${Date.now()}`,
        `scout-tags-charlie-${Date.now()}`,
      ];

      await kbnClient.savedObjects.create({
        type: SLO_TEMPLATE_SO_TYPE,
        id: TEMPLATE_IDS[0],
        attributes: { name: 'Template Alpha', tags: ['gamma', 'alpha', 'beta'] },
        overwrite: true,
      });
      await kbnClient.savedObjects.create({
        type: SLO_TEMPLATE_SO_TYPE,
        id: TEMPLATE_IDS[1],
        attributes: { name: 'Template Bravo', tags: ['beta', 'delta'] },
        overwrite: true,
      });
      await kbnClient.savedObjects.create({
        type: SLO_TEMPLATE_SO_TYPE,
        id: TEMPLATE_IDS[2],
        attributes: { name: 'Template Charlie', tags: ['alpha', 'epsilon'] },
        overwrite: true,
      });

      try {
        const response = await apiClient.get('api/observability/slo_templates/_tags', {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const body = response.body as { tags: string[] };
        expect(body.tags).toContain('alpha');
        expect(body.tags).toContain('beta');
        expect(body.tags).toContain('gamma');
        expect(body.tags).toContain('delta');
        expect(body.tags).toContain('epsilon');

        const sorted = [...body.tags].sort();
        expect(body.tags).toStrictEqual(sorted);
      } finally {
        for (const id of TEMPLATE_IDS) {
          await kbnClient.savedObjects.delete({ type: SLO_TEMPLATE_SO_TYPE, id });
        }
      }
    });

    apiTest('returns empty tags in a space with no templates', async ({ apiClient, kbnClient }) => {
      const SPACE_ID = `scout-template-tags-empty-${Date.now()}`;
      await kbnClient.spaces.create({ id: SPACE_ID, name: 'Scout Template Tags Empty Space' });

      try {
        const response = await apiClient.get(
          `s/${SPACE_ID}/api/observability/slo_templates/_tags`,
          { headers, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        expect((response.body as { tags: string[] }).tags).toStrictEqual([]);
      } finally {
        await kbnClient.spaces.delete(SPACE_ID);
      }
    });
  }
);
