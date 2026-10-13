/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import { EXECUTIVE_BRIEF_TAGS } from '../fixtures/constants';
import { apiTest } from '../fixtures';

apiTest.describe('Executive brief - authorization', { tag: EXECUTIVE_BRIEF_TAGS }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    // Kibana access without the Security feature, so no Entity Analytics privilege.
    const { cookieHeader } = await samlAuth.asInteractiveUser({
      elasticsearch: { cluster: [] },
      kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
    });
    headers = cookieHeader;
  });

  apiTest('a user without Entity Analytics access gets 403', async ({ entityAnalyticsApi }) => {
    const generate = await entityAnalyticsApi.generateExecutiveBrief(
      { body: { range: '7d' } },
      { headers }
    );
    expect(generate).toHaveStatusCode(403);

    const read = await entityAnalyticsApi.getExecutiveBrief({ headers });
    expect(read).toHaveStatusCode(403);

    const deleted = await entityAnalyticsApi.deleteExecutiveBrief({ headers });
    expect(deleted).toHaveStatusCode(403);
  });
});
