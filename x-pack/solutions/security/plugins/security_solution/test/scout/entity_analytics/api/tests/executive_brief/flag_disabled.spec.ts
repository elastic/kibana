/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, INTERNAL_API_HEADERS, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  EXECUTIVE_BRIEF_API_PATH,
  EXECUTIVE_BRIEF_INDEX,
} from '../../../../../../common/entity_analytics/executive_brief/constants';

const BRIEF_ROUTE = EXECUTIVE_BRIEF_API_PATH.replace(/^\//, '');

/**
 * The default server config runs with `entityAnalyticsExecutiveBriefEnabled` off. The enabled
 * behaviour is covered by `test/scout_entity_analytics_executive_brief`.
 */
apiTest.describe(
  'Executive brief - experimental flag disabled',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let headers: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = { 'kbn-xsrf': 'scout', ...INTERNAL_API_HEADERS, ...cookieHeader };
    });

    apiTest(
      'the routes are not registered and no index is created',
      async ({ apiClient, esClient }) => {
        const generate = await apiClient.post(BRIEF_ROUTE, {
          headers,
          responseType: 'json',
          body: { range: '7d' },
        });
        expect(generate).toHaveStatusCode(404);

        const read = await apiClient.get(BRIEF_ROUTE, { headers, responseType: 'json' });
        expect(read).toHaveStatusCode(404);

        const deleted = await apiClient.delete(BRIEF_ROUTE, { headers, responseType: 'json' });
        expect(deleted).toHaveStatusCode(404);

        expect(await esClient.indices.exists({ index: EXECUTIVE_BRIEF_INDEX })).toBe(false);
      }
    );
  }
);
