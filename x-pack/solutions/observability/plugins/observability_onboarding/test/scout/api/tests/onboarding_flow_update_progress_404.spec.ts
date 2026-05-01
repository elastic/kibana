/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import { ONBOARDING_COMMON_HEADERS } from '../fixtures/constants';
import { apiTest } from '../fixtures';

apiTest.describe(
  'Observability onboarding POST flow step — missing session',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('returns 404 when onboardingId does not exist', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const adminHeaders = {
        ...ONBOARDING_COMMON_HEADERS,
        ...cookieHeader,
      };
      const response = await apiClient.post(
        'internal/observability_onboarding/flow/test-onboarding-id/step/ea-download',
        {
          headers: {
            ...adminHeaders,
          },
          responseType: 'json',
          body: {
            status: 'complete',
          },
        }
      );
      expect(response).toHaveStatusCode(404);
      expect((response.body as { message?: string }).message).toContain(
        'onboarding session not found'
      );
    });
  }
);
