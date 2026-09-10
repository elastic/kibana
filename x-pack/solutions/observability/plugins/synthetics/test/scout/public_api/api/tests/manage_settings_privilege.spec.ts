/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, mergeSyntheticsApiHeaders } from '../../../common/fixtures';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';

const createRole = (privileges: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { uptime: privileges }, spaces: ['*'] }],
});

const roles = {
  read: createRole(['read']),
  manageSettings: createRole(['read', 'can_manage_settings']),
  all: createRole(['all']),
  minimalAll: createRole(['minimal_all']),
};

const updateSettings = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  body: Record<string, unknown>
) =>
  apiClient.put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS, {
    headers,
    body,
    responseType: 'json',
  });

apiTest.describe(
  'Synthetics manage settings privilege',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const roleHeaders: Record<keyof typeof roles, Record<string, string>> = {
      read: {},
      manageSettings: {},
      all: {},
      minimalAll: {},
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      const resolveRoleHeaders = async (role: KibanaRole) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);
        return mergeSyntheticsApiHeaders(apiKeyHeader);
      };

      roleHeaders.read = await resolveRoleHeaders(roles.read);
      roleHeaders.manageSettings = await resolveRoleHeaders(roles.manageSettings);
      roleHeaders.all = await resolveRoleHeaders(roles.all);
      roleHeaders.minimalAll = await resolveRoleHeaders(roles.minimalAll);
    });

    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: ['synthetics-dynamic-settings'] });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: ['synthetics-dynamic-settings'] });
    });

    apiTest('does not let a read-only user update settings', async ({ apiClient }) => {
      const response = await updateSettings(apiClient, roleHeaders.read, {
        certExpirationThreshold: 14,
      });

      expect(response).toHaveStatusCode(403);
    });

    apiTest(
      'lets the granular privilege update settings without broad write access',
      async ({ apiClient }) => {
        const settingsResponse = await updateSettings(apiClient, roleHeaders.manageSettings, {
          certExpirationThreshold: 14,
        });
        expect(settingsResponse).toHaveStatusCode(200);

        const paramsResponse = await apiClient.post(SYNTHETICS_API_URLS.PARAMS, {
          headers: roleHeaders.manageSettings,
          body: { key: 'not-allowed', value: 'secret' },
          responseType: 'json',
        });
        expect(paramsResponse).toHaveStatusCode(403);
      }
    );

    apiTest('requires rule management for default-rule settings', async ({ apiClient }) => {
      const response = await updateSettings(apiClient, roleHeaders.manageSettings, {
        defaultStatusRuleEnabled: false,
      });

      expect(response).toHaveStatusCode(403);
    });

    for (const privilege of ['all', 'minimalAll'] as const) {
      apiTest(`preserves settings access for ${privilege}`, async ({ apiClient }) => {
        const response = await updateSettings(apiClient, roleHeaders[privilege], {
          certAgeThreshold: 365,
        });
        expect(response).toHaveStatusCode(200);
      });
    }
  }
);
