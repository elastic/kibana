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
  'Profiling is not setup and no data is loaded',
  { tag: tags.stateful.classic },
  () => {
    let viewerApiCreditials: RoleApiCredentials;
    let adminApiCreditials: RoleApiCredentials;

    apiTest.beforeAll(async ({ profilingHelper, profilingSetup, requestAuth }) => {
      await profilingSetup.cleanup();
      await profilingHelper.cleanupPolicies();

      viewerApiCreditials = await requestAuth.getApiKey('viewer');
      adminApiCreditials = await requestAuth.getApiKey('admin');
    });

    apiTest('Admin users', async ({ apiClient }) => {
      const adminRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...adminApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBe(false);
      expect(adminStatus.has_data).toBeDefined();
      expect(adminStatus.pre_8_9_1_data).toBeDefined();
    });

    apiTest('Viewer users', async ({ apiClient }) => {
      const readRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBe(false);
      expect(readStatus.has_data).toBeDefined();
      expect(readStatus.pre_8_9_1_data).toBeDefined();
      expect(readStatus.has_required_role).toBe(false);
    });
  }
);
