/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import { esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe(
  'APM integration not installed but setup completed',
  { tag: tags.stateful.classic },
  () => {
    let viewerApiCreditials: RoleApiCredentials;
    let adminApiCreditials: RoleApiCredentials;

    apiTest.beforeAll(async ({ profilingHelper, profilingSetup, requestAuth }) => {
      // Full cleanup of all profiling data streams and indices left by other specs
      // (e.g. has_setup_with_data). The previous deleteByQuery on profiling-events-*
      // was insufficient: hasProfilingData() searches `profiling*`, which includes
      // stackframes, stacktraces, executables, and hosts.
      await profilingSetup.cleanup();

      await profilingHelper.installPolicies();
      await profilingSetup.setupResources();

      // setupResources() is asynchronous — poll until the status converges to
      // has_setup: true, has_data: false before running the actual tests.
      await expect
        .poll(
          async () => {
            const status = await profilingSetup.checkStatus();
            return status.has_setup === true && status.has_data === false;
          },
          {
            timeout: 30_000,
            intervals: [500, 1000, 2000, 4000],
            message:
              'Profiling status did not converge to has_setup: true, has_data: false after cleanup + setupResources',
          }
        )
        .toBe(true);

      viewerApiCreditials = await requestAuth.getApiKey('viewer');
      adminApiCreditials = await requestAuth.getApiKey('admin');
    });

    apiTest('Admin user', async ({ apiClient }) => {
      const adminRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...adminApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });

      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBe(true);
      expect(adminStatus.has_data).toBe(false);
      expect(adminStatus.pre_8_9_1_data).toBe(false);
    });

    apiTest('Viewer user', async ({ apiClient }) => {
      const readRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });

      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(true);
      expect(readStatus.has_data).toBe(false);
      expect(readStatus.pre_8_9_1_data).toBe(false);
      expect(readStatus.has_required_role).toBe(false);
    });
  }
);
