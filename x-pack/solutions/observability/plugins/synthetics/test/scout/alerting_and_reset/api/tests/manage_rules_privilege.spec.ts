/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ApiClientFixture, KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { apiTest, mergeSyntheticsApiHeaders } from '../../../common/fixtures';

const RULE_TYPE_ID = 'xpack.synthetics.alerts.monitorStatus';
const RULE_TAG = 'scout-synthetics-manage-rules-privilege';

const createRole = (privileges: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { uptime: privileges }, spaces: ['*'] }],
});

const readRole = createRole(['read']);
const readWithManageRulesRole = createRole(['read', 'can_manage_rules']);
const existingWriteRoles = {
  all: createRole(['all']),
  minimalAll: createRole(['minimal_all']),
};

const createRule = (apiClient: ApiClientFixture, headers: Record<string, string>, name: string) =>
  apiClient.post('api/alerting/rule', {
    headers,
    body: {
      name,
      rule_type_id: RULE_TYPE_ID,
      consumer: 'uptime',
      schedule: { interval: '1m' },
      enabled: false,
      params: {},
      actions: [],
      tags: [RULE_TAG],
    },
    responseType: 'json',
  });

const deleteRule = (apiClient: ApiClientFixture, headers: Record<string, string>, ruleId: string) =>
  apiClient.delete(`api/alerting/rule/${ruleId}`, {
    headers,
    responseType: 'json',
  });

apiTest.describe(
  'Synthetics manage rules privilege',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let readHeaders: Record<string, string>;
    let readWithManageRulesHeaders: Record<string, string>;
    const existingWriteHeaders: Record<keyof typeof existingWriteRoles, Record<string, string>> = {
      all: {},
      minimalAll: {},
    };

    apiTest.beforeAll(async ({ requestAuth }) => {
      const resolveRoleHeaders = async (role: KibanaRole) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(role);
        return mergeSyntheticsApiHeaders(apiKeyHeader);
      };

      readHeaders = await resolveRoleHeaders(readRole);
      readWithManageRulesHeaders = await resolveRoleHeaders(readWithManageRulesRole);
      existingWriteHeaders.all = await resolveRoleHeaders(existingWriteRoles.all);
      existingWriteHeaders.minimalAll = await resolveRoleHeaders(existingWriteRoles.minimalAll);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.alerting.cleanup.deleteRulesByTags([RULE_TAG]);
    });

    apiTest('does not let a read-only user create a rule', async ({ apiClient }) => {
      const response = await createRule(apiClient, readHeaders, `read-only-${uuidv4()}`);
      expect(response).toHaveStatusCode(403);
    });

    apiTest('lets a read user with can_manage_rules manage a rule', async ({ apiClient }) => {
      const name = `manage-rules-${uuidv4()}`;
      const createResponse = await createRule(apiClient, readWithManageRulesHeaders, name);
      expect(createResponse).toHaveStatusCode(200);

      const { id } = createResponse.body as { id: string };
      const updateResponse = await apiClient.put(`api/alerting/rule/${id}`, {
        headers: readWithManageRulesHeaders,
        body: {
          name: `${name}-updated`,
          schedule: { interval: '2m' },
          params: {},
          actions: [],
          tags: [RULE_TAG],
        },
        responseType: 'json',
      });
      expect(updateResponse).toHaveStatusCode(200);

      const deleteResponse = await deleteRule(apiClient, readWithManageRulesHeaders, id);
      expect(deleteResponse).toHaveStatusCode(204);
    });

    for (const [privilege, getHeaders] of [
      ['all', () => existingWriteHeaders.all],
      ['minimal_all', () => existingWriteHeaders.minimalAll],
    ] as const) {
      apiTest(`keeps rule management available to ${privilege} users`, async ({ apiClient }) => {
        const createResponse = await createRule(
          apiClient,
          getHeaders(),
          `${privilege}-${uuidv4()}`
        );
        expect(createResponse).toHaveStatusCode(200);

        const { id } = createResponse.body as { id: string };
        const deleteResponse = await deleteRule(apiClient, getHeaders(), id);
        expect(deleteResponse).toHaveStatusCode(204);
      });
    }
  }
);
