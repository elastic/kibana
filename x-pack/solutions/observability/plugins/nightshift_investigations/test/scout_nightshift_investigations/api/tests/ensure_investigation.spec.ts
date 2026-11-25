/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { apiTest, INVESTIGATIONS_WRITE_ROLE, ensureInvestigation, uniqueId } from '../fixtures';

// Ensuring an investigation needs the agentic investigations plugin, which is not enabled on
// serverless yet, so only the authorization check runs there.
apiTest.describe(
  'POST /internal/nightshift/investigations/{id}/_ensure',
  { tag: tags.stateful.classic },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE));
    });

    apiTest(
      'returns 404 when no live investigation workflow run names the investigation',
      async ({ apiClient }) => {
        const response = await ensureInvestigation(
          apiClient,
          cookieHeader,
          uniqueId('missing-ensure-investigation')
        );
        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
