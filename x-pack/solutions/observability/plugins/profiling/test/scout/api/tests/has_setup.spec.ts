/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest } from '../../common/fixtures';
import { esArchiversPath, esResourcesEndpoint } from '../../common/fixtures/constants';

/* eslint-disable @kbn/eslint/scout_max_one_describe */
apiTest.describe('Profiling is not setup and no data is loaded', { tag: ['@ess'] }, () => {
  let viewerApiCreditials: RoleApiCredentials;
  let adminApiCreditials: RoleApiCredentials;
  apiTest.beforeAll(async ({ profilingHelper, profilingSetup, requestAuth }) => {
    await profilingHelper.cleanupPolicies();
    await profilingHelper.installPolicies();
    await profilingSetup.cleanup();
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
    expect(adminStatus.has_setup).toBeFalsy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
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
    expect(readStatus.has_setup).toBeFalsy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });
});

apiTest.describe('APM integration not installed but setup completed', { tag: ['@ess'] }, () => {
  let viewerApiCreditials: RoleApiCredentials;
  let adminApiCreditials: RoleApiCredentials;
  apiTest.beforeAll(async ({ profilingSetup, requestAuth }) => {
    if (!(await profilingSetup.checkStatus()).has_setup) {
      await profilingSetup.setupResources();
    }
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
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
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
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });
});

apiTest.describe('Profiling is setup and data is loaded', { tag: ['@ess'] }, () => {
  let viewerApiCreditials: RoleApiCredentials;
  let adminApiCreditials: RoleApiCredentials;
  apiTest.beforeAll(async ({ requestAuth, profilingSetup }) => {
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
    expect(adminStatus.has_setup).toBeTruthy();
    expect(adminStatus.has_data).toBeTruthy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();
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
    expect(readStatus.has_setup).toBeTruthy();
    expect(readStatus.has_data).toBeTruthy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });
});

apiTest.describe('Collector integration is not installed', { tag: ['@ess'] }, () => {
  let viewerApiCreditials: RoleApiCredentials;
  apiTest.beforeAll(async ({ requestAuth, profilingSetup }) => {
    await profilingSetup.cleanup();
    viewerApiCreditials = await requestAuth.getApiKey('viewer');
  });
  apiTest.afterAll(async ({ profilingHelper }) => {
    profilingHelper.cleanupPolicies();
  });

  apiTest('collector integration missing', async ({ profilingHelper, apiServices, apiClient }) => {
    const ids = await profilingHelper.getPoliciyIds();
    const collectorId = ids.collectorId;

    await apiServices.fleet.package_policies.delete(collectorId!);

    expect(collectorId).toBeDefined();

    const adminRes = await apiClient.get(esResourcesEndpoint);
    const adminStatus = adminRes.body;
    expect(adminStatus.has_setup).toBeFalsy();
    expect(adminStatus.has_data).toBeFalsy();
    expect(adminStatus.pre_8_9_1_data).toBeFalsy();

    const readRes = await apiClient.get(esResourcesEndpoint, {
      headers: {
        ...viewerApiCreditials.apiKeyHeader,
        'content-type': 'application/json',
        'kbn-xsrf': 'reporting',
      },
    });
    const readStatus = readRes.body;
    expect(readStatus.has_setup).toBeFalsy();
    expect(readStatus.has_data).toBeFalsy();
    expect(readStatus.pre_8_9_1_data).toBeFalsy();
    expect(readStatus.has_required_role).toBeFalsy();
  });

  apiTest(
    'Symbolizer integration is not installed',
    async ({ profilingHelper, apiClient, apiServices }) => {
      const ids = await profilingHelper.getPoliciyIds();

      const symbolizerId = ids.symbolizerId;

      await apiServices.fleet.package_policies.delete(symbolizerId!);

      expect(symbolizerId).toBeDefined();

      const adminRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
          'content-type': 'application/json',
          'kbn-xsrf': 'reporting',
        },
      });
      const adminStatus = adminRes.body;
      expect(adminStatus.has_setup).toBeFalsy();
      expect(adminStatus.has_data).toBeFalsy();
      expect(adminStatus.pre_8_9_1_data).toBeFalsy();

      const readRes = await apiClient.get(esResourcesEndpoint, {
        headers: {
          ...viewerApiCreditials.apiKeyHeader,
        },
      });
      const readStatus = readRes.body;
      expect(readStatus.has_setup).toBeFalsy();
      expect(readStatus.has_data).toBeFalsy();
      expect(readStatus.pre_8_9_1_data).toBeFalsy();
      expect(readStatus.has_required_role).toBeFalsy();
    }
  );
});
