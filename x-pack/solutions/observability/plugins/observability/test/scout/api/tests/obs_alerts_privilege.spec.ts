/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout-oblt';
import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { OBS_ALERTING_FEATURES } from '@kbn/rule-data-utils';
import { KIBANA_HEADERS } from '../fixtures/helpers';
import { retryForSuccess } from '../fixtures/poll';

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

interface RuleSpec {
  ruleTypeId: string;
  consumer: string;
  params: Record<string, unknown>;
  enabled: boolean;
}

const ES_QUERY_CONSUMER = 'logs';

const RULE_SPECS: RuleSpec[] = OBS_ALERTING_FEATURES.map(({ ruleTypeId, consumers }) => ({
  ruleTypeId,
  consumer: ruleTypeId === '.es-query' ? ES_QUERY_CONSUMER : consumers[0],
  params: ruleTypeId === '.es-query' ? ES_QUERY_PARAMS : {},
  enabled: ruleTypeId === '.es-query',
}));

const FAKE_ALERT_INSTANCE_ID = 'fake-instance-id';

apiTest.describe(
  'Observability alerts privilege',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCreds: RoleApiCredentials;
    let withAllPrivilegeCreds: RoleApiCredentials;
    let withReadPrivilegeCreds: RoleApiCredentials;
    let withoutPrivilegeCreds: RoleApiCredentials;

    const createdRules: Array<{ ruleTypeId: string; ruleId: string }> = [];
    let enabledRuleId: string | undefined;
    let realAlertId: string | undefined;

    apiTest.beforeAll(async ({ apiClient, requestAuth, samlAuth }) => {
      adminCreds = await requestAuth.getApiKeyForAdmin();

      withAllPrivilegeCreds = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: [], feature: { observabilityAlerts: ['all'] }, spaces: ['*'] }],
        elasticsearch: { cluster: [], indices: [] },
      });

      withReadPrivilegeCreds = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: [], feature: { observabilityAlerts: ['read'] }, spaces: ['*'] }],
        elasticsearch: { cluster: [], indices: [] },
      });

      withoutPrivilegeCreds = await requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: [], feature: { discover: ['read'] }, spaces: ['*'] }],
        elasticsearch: { cluster: [], indices: [] },
      });

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

        if (response.statusCode === 200) {
          const ruleId = (response.body as { id: string }).id;
          createdRules.push({ ruleTypeId: spec.ruleTypeId, ruleId });
          if (spec.enabled) {
            enabledRuleId = ruleId;
          }
        }
      }

      if (enabledRuleId) {
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
      }
    });

    apiTest.afterAll(async ({ apiClient }) => {
      for (const { ruleId } of createdRules) {
        await apiClient.delete(`api/alerting/rule/${ruleId}`, {
          headers: { ...KIBANA_HEADERS, ...adminCreds.apiKeyHeader },
        });
      }
    });

    apiTest.describe('with observabilityAlerts all privilege', () => {
      for (const spec of RULE_SPECS) {
        apiTest(`cannot create a ${spec.ruleTypeId} rule`, async ({ apiClient }) => {
          const response = await apiClient.post('api/alerting/rule', {
            headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
            body: {
              name: 'Should fail',
              rule_type_id: spec.ruleTypeId,
              consumer: spec.consumer,
              schedule: { interval: '1m' },
              enabled: false,
              params: spec.params,
              actions: [],
              tags: [],
            },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(403);
        });
      }

      apiTest('cannot update a rule', async ({ apiClient }) => {
        const rule = createdRules[0];
        if (!rule) return;
        const spec = RULE_SPECS.find((s) => s.ruleTypeId === rule.ruleTypeId);
        const response = await apiClient.put(`api/alerting/rule/${rule.ruleId}`, {
          headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
          body: {
            name: 'Updated name',
            schedule: { interval: '2m' },
            params: spec?.params ?? {},
            actions: [],
            tags: [],
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      });

      apiTest('cannot delete a rule', async ({ apiClient }) => {
        const rule = createdRules[0];
        if (!rule) return;
        const response = await apiClient.delete(`api/alerting/rule/${rule.ruleId}`, {
          headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      });

      apiTest('cannot mute all alerts on a rule', async ({ apiClient }) => {
        const rule = createdRules[0];
        if (!rule) return;
        const response = await apiClient.post(`api/alerting/rule/${rule.ruleId}/_mute_all`, {
          headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
        });
        expect(response).toHaveStatusCode(403);
      });

      apiTest('cannot snooze a rule', async ({ apiClient }) => {
        const rule = createdRules[0];
        if (!rule) return;
        const response = await apiClient.post(`internal/alerting/rule/${rule.ruleId}/_snooze`, {
          headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
          body: {
            snooze_schedule: {
              duration: 3600000,
              rRule: {
                dtstart: new Date().toISOString(),
                tzid: 'UTC',
                count: 1,
              },
            },
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      });

      for (const spec of RULE_SPECS) {
        apiTest(`can mute an alert instance for ${spec.ruleTypeId}`, async ({ apiClient }) => {
          const rule = createdRules.find((r) => r.ruleTypeId === spec.ruleTypeId);
          if (!rule) return;
          const response = await apiClient.post(
            `api/alerting/rule/${rule.ruleId}/alert/${FAKE_ALERT_INSTANCE_ID}/_mute?validate_alerts_existence=false`,
            { headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader } }
          );
          expect(response).toHaveStatusCode(204);
        });

        apiTest(`can unmute an alert instance for ${spec.ruleTypeId}`, async ({ apiClient }) => {
          const rule = createdRules.find((r) => r.ruleTypeId === spec.ruleTypeId);
          if (!rule) return;
          const response = await apiClient.post(
            `api/alerting/rule/${rule.ruleId}/alert/${FAKE_ALERT_INSTANCE_ID}/_unmute?validate_alerts_existence=false`,
            { headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader } }
          );
          expect(response).toHaveStatusCode(204);
        });
      }

      apiTest('can find alerts via RAC', async ({ apiClient }) => {
        const response = await apiClient.post('internal/rac/alerts/find', {
          headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
          body: {
            rule_type_ids: ['.es-query'],
            consumers: ['logs'],
            query: { match_all: {} },
            size: 10,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const body = response.body as {
          hits?: { total?: { value?: number }; hits?: Array<{ _source: Record<string, unknown> }> };
        };
        expect(body.hits?.total?.value).toBeGreaterThan(0);

        const alert = body.hits!.hits![0]._source;
        expect(alert['kibana.alert.rule.rule_type_id']).toBe('.es-query');
        expect(alert['kibana.alert.status']).toBeDefined();
      });

      apiTest('can acknowledge a real alert via bulk update', async ({ apiClient }) => {
        if (!realAlertId) {
          return;
        }
        const response = await apiClient.post('internal/rac/alerts/bulk_update', {
          headers: { ...KIBANA_HEADERS, ...withAllPrivilegeCreds.apiKeyHeader },
          body: {
            status: 'acknowledged',
            ids: [realAlertId],
            index: '.alerts-stack.alerts-default',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
      });
    });

    apiTest.describe('with observabilityAlerts read privilege', () => {
      apiTest('can find alerts via RAC', async ({ apiClient }) => {
        const response = await apiClient.post('internal/rac/alerts/find', {
          headers: { ...KIBANA_HEADERS, ...withReadPrivilegeCreds.apiKeyHeader },
          body: {
            rule_type_ids: ['.es-query'],
            consumers: ['logs'],
            query: { match_all: {} },
            size: 10,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);

        const body = response.body as {
          hits?: { total?: { value?: number }; hits?: Array<{ _source: Record<string, unknown> }> };
        };
        expect(body.hits?.total?.value).toBeGreaterThan(0);
      });

      for (const spec of RULE_SPECS) {
        apiTest(`cannot mute an alert instance for ${spec.ruleTypeId}`, async ({ apiClient }) => {
          const rule = createdRules.find((r) => r.ruleTypeId === spec.ruleTypeId);
          if (!rule) return;
          const response = await apiClient.post(
            `api/alerting/rule/${rule.ruleId}/alert/${FAKE_ALERT_INSTANCE_ID}/_mute?validate_alerts_existence=false`,
            { headers: { ...KIBANA_HEADERS, ...withReadPrivilegeCreds.apiKeyHeader } }
          );
          expect(response).toHaveStatusCode(403);
        });
      }

      apiTest('cannot acknowledge an alert via bulk update', async ({ apiClient }) => {
        const response = await apiClient.post('internal/rac/alerts/bulk_update', {
          headers: { ...KIBANA_HEADERS, ...withReadPrivilegeCreds.apiKeyHeader },
          body: {
            status: 'acknowledged',
            ids: [realAlertId ?? 'nonexistent'],
            index: '.alerts-stack.alerts-default',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      });

      for (const spec of RULE_SPECS) {
        apiTest(`cannot create a ${spec.ruleTypeId} rule`, async ({ apiClient }) => {
          const response = await apiClient.post('api/alerting/rule', {
            headers: { ...KIBANA_HEADERS, ...withReadPrivilegeCreds.apiKeyHeader },
            body: {
              name: 'Should fail',
              rule_type_id: spec.ruleTypeId,
              consumer: spec.consumer,
              schedule: { interval: '1m' },
              enabled: false,
              params: spec.params,
              actions: [],
              tags: [],
            },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(403);
        });
      }
    });

    apiTest.describe('without observabilityAlerts privilege', () => {
      for (const spec of RULE_SPECS) {
        apiTest(`cannot mute an alert instance for ${spec.ruleTypeId}`, async ({ apiClient }) => {
          const rule = createdRules.find((r) => r.ruleTypeId === spec.ruleTypeId);
          if (!rule) return;
          const response = await apiClient.post(
            `api/alerting/rule/${rule.ruleId}/alert/${FAKE_ALERT_INSTANCE_ID}/_mute?validate_alerts_existence=false`,
            { headers: { ...KIBANA_HEADERS, ...withoutPrivilegeCreds.apiKeyHeader } }
          );
          expect(response).toHaveStatusCode(403);
        });

        apiTest(`cannot unmute an alert instance for ${spec.ruleTypeId}`, async ({ apiClient }) => {
          const rule = createdRules.find((r) => r.ruleTypeId === spec.ruleTypeId);
          if (!rule) return;
          const response = await apiClient.post(
            `api/alerting/rule/${rule.ruleId}/alert/${FAKE_ALERT_INSTANCE_ID}/_unmute?validate_alerts_existence=false`,
            { headers: { ...KIBANA_HEADERS, ...withoutPrivilegeCreds.apiKeyHeader } }
          );
          expect(response).toHaveStatusCode(403);
        });
      }

      apiTest('cannot find alerts via RAC', async ({ apiClient }) => {
        const response = await apiClient.post('internal/rac/alerts/find', {
          headers: { ...KIBANA_HEADERS, ...withoutPrivilegeCreds.apiKeyHeader },
          body: {
            rule_type_ids: ['.es-query'],
            consumers: ['logs'],
            query: { match_all: {} },
            size: 10,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      });

      apiTest('cannot acknowledge an alert via bulk update', async ({ apiClient }) => {
        const response = await apiClient.post('internal/rac/alerts/bulk_update', {
          headers: { ...KIBANA_HEADERS, ...withoutPrivilegeCreds.apiKeyHeader },
          body: {
            status: 'acknowledged',
            ids: [realAlertId ?? 'nonexistent'],
            index: '.alerts-stack.alerts-default',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      });
    });
  }
);
