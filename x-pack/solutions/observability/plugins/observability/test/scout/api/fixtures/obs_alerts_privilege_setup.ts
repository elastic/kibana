/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApiClientFixture,
  RequestAuthFixture,
  SamlAuth,
  RoleApiCredentials,
} from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { OBS_ALERTING_FEATURES } from '@kbn/rule-data-utils';
import { KIBANA_HEADERS } from './helpers';
import { retryForSuccess } from './poll';

export interface RuleSpec {
  ruleTypeId: string;
  consumer: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

const ES_QUERY_PARAMS = {
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
  esQuery: '{\n  "query":{\n    "match_all" : {}\n  }\n}',
  size: 100,
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: '>',
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
};

export const ES_QUERY_CONSUMER = 'logs';

export const RULE_SPECS: RuleSpec[] = OBS_ALERTING_FEATURES.map(({ ruleTypeId, consumers }) => ({
  ruleTypeId,
  consumer: ruleTypeId === '.es-query' ? ES_QUERY_CONSUMER : consumers[0],
  params: ruleTypeId === '.es-query' ? ES_QUERY_PARAMS : {},
  enabled: ruleTypeId === '.es-query',
}));

export const FAKE_ALERT_INSTANCE_ID = 'fake-instance-id';

export interface ObsAlertsPrivilegeState {
  adminCreds: RoleApiCredentials;
  createdRules: Array<{ ruleTypeId: string; ruleId: string }>;
  enabledRuleId: string;
  realAlertId: string;
}

export const setupObsAlertsPrivilegeRules = async ({
  apiClient,
  requestAuth,
  samlAuth,
}: {
  apiClient: ApiClientFixture;
  requestAuth: RequestAuthFixture;
  samlAuth: SamlAuth;
}): Promise<ObsAlertsPrivilegeState> => {
  const adminCreds = await requestAuth.getApiKeyForAdmin();
  const createdRules: Array<{ ruleTypeId: string; ruleId: string }> = [];
  let enabledRuleId: string | undefined;

  for (const spec of RULE_SPECS) {
    const response = await apiClient.post('api/alerting/rule', {
      headers: { ...KIBANA_HEADERS, ...adminCreds.apiKeyHeader },
      body: {
        name: `Scout obs-alerts-priv: ${spec.ruleTypeId}`,
        rule_type_id: spec.ruleTypeId,
        consumer: spec.consumer,
        schedule: { interval: '1m' },
        enabled: spec.enabled,
        params: spec.params,
        actions: [],
        tags: ['scout-obs-alerts-priv'],
      },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    const ruleId = (response.body as { id: string }).id;
    createdRules.push({ ruleTypeId: spec.ruleTypeId, ruleId });
    if (spec.enabled) {
      enabledRuleId = ruleId;
    }
  }

  expect(enabledRuleId).toBeDefined();

  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  const eventLogHeaders = { ...KIBANA_HEADERS, ...cookieHeader };

  await retryForSuccess(
    async () => {
      const logResponse = await apiClient.get(
        `internal/alerting/rule/${enabledRuleId}/_execution_log?date_start=${encodeURIComponent(
          new Date(Date.now() - 60_000).toISOString()
        )}&per_page=10`,
        { headers: eventLogHeaders, responseType: 'json' }
      );
      const body = logResponse.body as { data: Array<{ status: string }> };
      if (!body.data?.some((entry) => entry.status === 'success')) {
        throw new Error('Rule has not executed successfully yet');
      }
    },
    { timeoutMs: 60_000, intervalMs: 2_000, label: 'wait for .es-query rule execution' }
  );

  let realAlertId: string | undefined;
  await retryForSuccess(
    async () => {
      const findResponse = await apiClient.post('internal/rac/alerts/find', {
        headers: { ...KIBANA_HEADERS, ...adminCreds.apiKeyHeader },
        body: {
          rule_type_ids: ['.es-query'],
          consumers: [ES_QUERY_CONSUMER],
          query: { match_all: {} },
          size: 1,
        },
        responseType: 'json',
      });
      const findBody = findResponse.body as { hits?: { hits?: Array<{ _id: string }> } };
      const alertDoc = findBody?.hits?.hits?.[0];
      if (!alertDoc) {
        throw new Error('No alert doc found yet');
      }
      realAlertId = alertDoc._id;
    },
    { timeoutMs: 30_000, intervalMs: 2_000, label: 'wait for alert to appear in .alerts-*' }
  );

  expect(realAlertId).toBeDefined();

  return {
    adminCreds,
    createdRules,
    enabledRuleId: enabledRuleId!,
    realAlertId: realAlertId!,
  };
};

export const teardownObsAlertsPrivilegeRules = async (
  apiClient: ApiClientFixture,
  adminCreds: RoleApiCredentials,
  createdRules: Array<{ ruleId: string }>
): Promise<void> => {
  for (const { ruleId } of createdRules) {
    await apiClient.delete(`api/alerting/rule/${ruleId}`, {
      headers: { ...KIBANA_HEADERS, ...adminCreds.apiKeyHeader },
    });
  }
};
