/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-security';
import { apiTest, expect, tags } from '@kbn/scout-security';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

apiTest.describe('Entity Store API tests', { tag: tags.DEPLOYMENT_AGNOSTIC }, () => {
  let apiCredentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ requestAuth }) => {
    apiCredentials = await requestAuth.getApiKey('admin');
  });

  apiTest(
    'Should install the entity store happy path with feature flag enabled',
    async ({ apiClient }) => {
      await apiClient.post('internal/kibana/settings', {
        headers: {
          ...apiCredentials.apiKeyHeader,
          ...COMMON_HEADERS,
        },
        responseType: 'json',
        body: {
          changes: {
            [FF_ENABLE_ENTITY_STORE_V2]: true,
          },
        },
      });

      const install = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: {
          ...apiCredentials.apiKeyHeader,
          ...COMMON_HEADERS,
        },
        responseType: 'json',
        body: {},
      });
      expect(install.statusCode).toBe(200);

      const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
        headers: {
          ...apiCredentials.apiKeyHeader,
          ...COMMON_HEADERS,
        },
        responseType: 'json',
        body: {},
      });
      expect(uninstall.statusCode).toBe(200);
    }
  );

  apiTest('Should fail with feature flag disabled', async ({ apiClient }) => {
    await apiClient.post('internal/kibana/settings', {
      headers: {
        ...apiCredentials.apiKeyHeader,
        ...COMMON_HEADERS,
      },
      responseType: 'json',
      body: {
        changes: {
          [FF_ENABLE_ENTITY_STORE_V2]: false,
        },
      },
    });

    const install = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: {
        ...apiCredentials.apiKeyHeader,
        ...COMMON_HEADERS,
      },
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(403);
  });
});
