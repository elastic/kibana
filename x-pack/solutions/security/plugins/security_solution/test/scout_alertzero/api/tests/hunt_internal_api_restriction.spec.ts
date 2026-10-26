/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_THREAT_INTEL_SUPPLY_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import { apiTest, withAlertZeroEnabledInSpace } from '../fixtures';

/**
 * Depends on `--server.restrictInternalApis=true` from the alertzero config set, which
 * cloud stateful runs do not get (their default leaves the restriction off), so this suite
 * is tagged for the local lane only.
 */
apiTest.describe(
  'Hunt Watch - internal API restriction',
  { tag: ['@local-stateful-classic'] },
  () => {
    // The supply route is gated on the per-space AlertZero setting (a gated route 404s as if
    // never registered). The internal-origin rejection this suite asserts is core middleware
    // and fires before that handler gate, but enabling explicitly keeps the assertion about
    // exactly one thing — the missing header — instead of also depending on that ordering.
    let restoreAlertZero: (() => Promise<void>) | undefined;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      restoreAlertZero = await withAlertZeroEnabledInSpace({
        apiClient,
        headers: cookieHeader,
        spaceId: 'default',
      });
    });

    apiTest.afterAll(async () => {
      await restoreAlertZero?.();
    });

    apiTest(
      'returns 400 when an admin omits the internal-origin header',
      async ({ samlAuth, apiClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
        const response = await apiClient.get(HUNT_THREAT_INTEL_SUPPLY_URL, {
          headers: {
            ...cookieHeader,
            'kbn-xsrf': 'true',
            'elastic-api-version': '1',
          },
          responseType: 'json',
        });
        expect(response.statusCode).toBe(400);
        expect((response.body as { message?: string }).message).toContain(
          'is not available with the current configuration'
        );
      }
    );
  }
);
