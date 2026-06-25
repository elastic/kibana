/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { KIBANA_HEADERS } from '../fixtures/helpers';
import {
  type ObsAlertsPrivilegeState,
  setupObsAlertsPrivilegeRules,
  teardownObsAlertsPrivilegeRules,
} from '../fixtures/obs_alerts_privilege_setup';

apiTest.describe(
  'Logs feature – read privilege bulk_update check',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let state: ObsAlertsPrivilegeState;
    let logsReadCreds: RoleApiCredentials;

    apiTest.beforeAll(async ({ apiClient, requestAuth, samlAuth }) => {
      state = await setupObsAlertsPrivilegeRules({ apiClient, requestAuth, samlAuth });

      logsReadCreds = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: [], feature: { logs: ['read'] }, spaces: ['*'] }],
        elasticsearch: { cluster: [], indices: [] },
      });
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await teardownObsAlertsPrivilegeRules(apiClient, state.adminCreds, state.createdRules);
    });

    apiTest('logs read: cannot acknowledge an alert via bulk update', async ({ apiClient }) => {
      const response = await apiClient.post('internal/rac/alerts/bulk_update', {
        headers: { ...KIBANA_HEADERS, ...logsReadCreds.apiKeyHeader },
        body: {
          status: 'acknowledged',
          ids: [state.realAlertId],
          index: '.alerts-stack.alerts-default',
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    });

    apiTest('logs read: can find alerts via RAC', async ({ apiClient }) => {
      const response = await apiClient.post('internal/rac/alerts/find', {
        headers: { ...KIBANA_HEADERS, ...logsReadCreds.apiKeyHeader },
        body: {
          rule_type_ids: ['.es-query'],
          consumers: ['logs'],
          query: { match_all: {} },
          size: 10,
        },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
    });
  }
);
