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
import { esArchiversPath, esResourcesEndpoint } from '../../common/fixtures/constants';

apiTest.describe('Profiling is setup and data is loaded', { tag: tags.stateful.classic }, () => {
  // ES profiling resource creation can race with prior cleanup (background ProfilingIndexManager); allow extra hook budget so a fresh setup + data load completes reliably.
  // eslint-disable-next-line @kbn/eslint/scout_no_describe_configure -- extended timeout applies to hooks (beforeAll); see https://playwright.dev/docs/test-timeouts
  apiTest.describe.configure({ timeout: 180_000 });

  let viewerApiCreditials: RoleApiCredentials;
  let adminApiCreditials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth, profilingSetup }) => {
    // Ensure the ES profiling data streams + aliases (`profiling-stackframes`, `profiling-stacktraces`, `profiling-executables`, `profiling-hosts`, `profiling-events-*`) exist before we bulk-write into them. Bulk `create` ops to non-existing aliases would otherwise create regular indices that later collide with the ES profiling plugin's alias creation (`InvalidAliasNameException`).
    if (!(await profilingSetup.checkStatus()).has_setup) {
      await profilingSetup.setupResources();
    }
    await profilingSetup.loadData(esArchiversPath);
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
    expect(adminStatus.has_data).toBe(true);
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
    expect(readStatus.has_data).toBe(true);
    expect(readStatus.pre_8_9_1_data).toBe(false);
    expect(readStatus.has_required_role).toBe(false);
  });
});
