/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { apiTest, INVESTIGATIONS_READ_ROLE, ensureInvestigation } from '../fixtures';

apiTest.describe(
  'POST /internal/nightshift/investigations/{id}/_ensure authorization',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest(
      'returns 403 for a user without agentBuilder:write',
      async ({ apiClient, samlAuth }) => {
        const unauthorized = await samlAuth.asInteractiveUser(INVESTIGATIONS_READ_ROLE);
        const response = await ensureInvestigation(apiClient, unauthorized.cookieHeader, 'any-id');
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
