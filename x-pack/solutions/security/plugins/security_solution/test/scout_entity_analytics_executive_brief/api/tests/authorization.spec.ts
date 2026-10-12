/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { BRIEF_ROUTE, EXECUTIVE_BRIEF_TAGS, INTERNAL_HEADERS } from '../fixtures/constants';

apiTest.describe('Executive brief - authorization', { tag: EXECUTIVE_BRIEF_TAGS }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    // Kibana access without the Security feature, so no Entity Analytics privilege.
    const { cookieHeader } = await samlAuth.asInteractiveUser({
      elasticsearch: { cluster: [] },
      kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
    });
    headers = { ...INTERNAL_HEADERS, ...cookieHeader };
  });

  apiTest('a user without Entity Analytics access gets 403', async ({ apiClient }) => {
    const generate = await apiClient.post(BRIEF_ROUTE, {
      headers,
      responseType: 'json',
      body: { range: '7d' },
    });
    expect(generate).toHaveStatusCode(403);

    const read = await apiClient.get(BRIEF_ROUTE, { headers, responseType: 'json' });
    expect(read).toHaveStatusCode(403);

    const deleted = await apiClient.delete(BRIEF_ROUTE, { headers, responseType: 'json' });
    expect(deleted).toHaveStatusCode(403);
  });
});
