/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HUNT_THREAT_INTEL_SUPPLY_URL } from '@kbn/alertzero-common';
import { expect } from '@kbn/scout-security/api';
import { apiTest } from '../fixtures';

/**
 * Depends on `--server.restrictInternalApis=true` from the alertzero config set, which
 * cloud stateful runs do not get (their default leaves the restriction off), so this suite
 * is tagged for the local lane only.
 */
apiTest.describe(
  'Hunt Watch - internal API restriction',
  { tag: ['@local-stateful-classic'] },
  () => {
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
