/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import { InfraRuleType } from '@kbn/rule-data-utils';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  METRIC_THRESHOLD_INDEX,
  installMetricThresholdDataForge,
  removeMetricThresholdDataForge,
} from '../fixtures/data_forge';
import { getAdminHeaders, type RuleResponse } from '../fixtures/helpers';
import { pollUntilTrue } from '../fixtures/poll';

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/alerting_api_integration/observability/metric_threshold_rule.ts`.
 *
 * Runs against stateful classic only (matching the original trial-license FTR
 * config). The endpoints under test are driven through `apiClient` with an admin
 * API key; `esClient` is used for data-forge setup and alert/action document
 * assertions. These tests verify rule execution and parameter persistence, not
 * RBAC, so an admin-scoped key maps cleanly to the FTR superuser pattern.
 *
 * `Aggregators.AVERAGE` (`'avg'`) is inlined rather than imported from
 * `@kbn/infra-plugin` to avoid pulling an infra plugin reference into the
 * observability test project; the rule type id and comparator come from shared
 * packages (`@kbn/rule-data-utils`, `@kbn/alerting-comparators`).
 */

const METRICS_ALERTS_INDEX = '.alerts-observability.metrics.alerts-default';
const ALERT_ACTION_INDEX = 'alert-action-metric-threshold';
const AVG_AGG_TYPE = 'avg'; // Aggregators.AVERAGE from @kbn/infra-plugin

const baseCriteria = [
  {
    aggType: AVG_AGG_TYPE,
    comparator: COMPARATORS.GREATER_THAN,
    threshold: [0.5],
    timeSize: 5,
    timeUnit: 'm',
    metric: 'system.cpu.user.pct',
  },
];

const createMetricThresholdRule = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  {
    name,
    params,
    actions = [],
  }: { name: string; params: Record<string, unknown>; actions?: unknown[] }
): Promise<RuleResponse> => {
  const res = await apiClient.post('api/alerting/rule', {
    headers,
    responseType: 'json',
    body: {
      name,
      rule_type_id: InfraRuleType.MetricThreshold,
      consumer: 'infrastructure',
      tags: ['infrastructure'],
      schedule: { interval: '1m' },
      params,
      actions,
    },
  });
  expect(res).toHaveStatusCode(200);
  return res.body as RuleResponse;
};

apiTest.describe('Metric threshold rule', { tag: [...tags.stateful.classic] }, () => {
  let headers: Record<string, string>;
  let ruleId: string;
  let actionId: string;
  let alertId: string;
  let dataForgeIndices: string[] = [];
  // Rules created by the `noDataBehavior` cases; removed after each such test.
  let transientRuleIds: string[] = [];

  apiTest.beforeAll(async ({ apiClient, esClient, log, requestAuth }) => {
    headers = await getAdminHeaders(requestAuth);

    await apiClient.patch('api/metrics/source/default', {
      headers,
      responseType: 'json',
      body: {
        anomalyThreshold: 50,
        description: '',
        metricAlias: METRIC_THRESHOLD_INDEX,
        name: 'Default',
      },
    });

    dataForgeIndices = await installMetricThresholdDataForge(esClient, log);

    await pollUntilTrue(
      async () => {
        const count = await esClient.count({
          index: dataForgeIndices.join(','),
          ignore_unavailable: true,
        });
        return count.count >= 45;
      },
      { timeoutMs: 90_000, intervalMs: 2_000, label: 'data forge documents to be indexed' }
    );

    const connectorRes = await apiClient.post('api/actions/connector', {
      headers,
      responseType: 'json',
      body: {
        name: 'Index Connector: Metric threshold API test',
        connector_type_id: '.index',
        config: { index: ALERT_ACTION_INDEX, refresh: true },
        secrets: {},
      },
    });
    expect(connectorRes).toHaveStatusCode(200);
    actionId = connectorRes.body.id as string;

    const rule = await createMetricThresholdRule(apiClient, headers, {
      name: 'Metric threshold rule',
      params: {
        criteria: baseCriteria,
        sourceId: 'default',
        alertOnNoData: true,
        alertOnGroupDisappear: true,
      },
      actions: [
        {
          group: 'metrics.threshold.fired',
          id: actionId,
          params: {
            documents: [
              {
                ruleType: '{{rule.type}}',
                alertDetailsUrl: '{{context.alertDetailsUrl}}',
                reason: '{{context.reason}}',
              },
            ],
          },
          frequency: { notify_when: 'onActionGroupChange', throttle: null, summary: false },
        },
      ],
    });
    ruleId = rule.id;

    // Resolve the fired alert's uuid up front so individual tests don't depend
    // on each other's execution order for it. If a test that needs `alertId`
    // ran before the one that produced it, the value would be `undefined`.
    await pollUntilTrue(
      async () => {
        const resp = await esClient.search<Record<string, unknown>>({
          index: METRICS_ALERTS_INDEX,
          query: { bool: { filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }] } },
          ignore_unavailable: true,
        });
        if (resp.hits.hits.length === 0) {
          return false;
        }
        alertId = resp.hits.hits[0]._source?.['kibana.alert.uuid'] as string;
        return true;
      },
      { timeoutMs: 120_000, intervalMs: 3_000, label: 'metric threshold alert uuid' }
    );
  });

  apiTest.afterEach(async ({ apiClient }) => {
    for (const id of transientRuleIds) {
      await apiClient.delete(`api/alerting/rule/${id}`, { headers });
    }
    transientRuleIds = [];
  });

  apiTest.afterAll(async ({ apiClient, esClient, log }) => {
    await apiClient.delete(`api/alerting/rule/${ruleId}`, { headers });
    await apiClient.delete(`api/actions/connector/${actionId}`, { headers });
    await esClient.indices
      .delete({ index: [ALERT_ACTION_INDEX, ...dataForgeIndices], ignore_unavailable: true })
      .catch(() => undefined);
    await esClient
      .deleteByQuery({
        index: METRICS_ALERTS_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        conflicts: 'proceed',
        ignore_unavailable: true,
      })
      .catch(() => undefined);
    await esClient
      .deleteByQuery({
        index: '.kibana-event-log-*',
        // Scope to this rule only (event-log docs carry `rule.id`, not
        // `kibana.alert.rule.uuid`); a consumer-wide delete would wipe other
        // infrastructure rules' event log on a shared parallel-CI cluster.
        query: { term: { 'rule.id': ruleId } },
        conflicts: 'proceed',
        ignore_unavailable: true,
      })
      .catch(() => undefined);
    await removeMetricThresholdDataForge(esClient, log);
  });

  apiTest('rule should be active', async ({ apiClient }) => {
    await pollUntilTrue(
      async () => {
        const res = await apiClient.get(`api/alerting/rule/${ruleId}`, {
          headers,
          responseType: 'json',
        });
        return res.body?.execution_status?.status === 'active';
      },
      { timeoutMs: 120_000, intervalMs: 3_000, label: 'metric threshold rule to become active' }
    );
  });

  apiTest('should set correct information in the alert document', async ({ esClient }) => {
    let source: Record<string, unknown> = {};
    await pollUntilTrue(
      async () => {
        const resp = await esClient.search<Record<string, unknown>>({
          index: METRICS_ALERTS_INDEX,
          query: { bool: { filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }] } },
          ignore_unavailable: true,
        });
        if (resp.hits.hits.length === 0) {
          return false;
        }
        source = resp.hits.hits[0]._source as Record<string, unknown>;
        return true;
      },
      { timeoutMs: 120_000, intervalMs: 3_000, label: 'metric threshold alert document' }
    );

    expect(source).toMatchObject({
      'kibana.alert.rule.category': 'Metric threshold',
      'kibana.alert.rule.consumer': 'infrastructure',
      'kibana.alert.rule.name': 'Metric threshold rule',
      'kibana.alert.rule.producer': 'infrastructure',
      'kibana.alert.rule.revision': 0,
      'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.action_group': 'metrics.threshold.fired',
      'kibana.alert.instance.id': '*',
      'kibana.alert.workflow_status': 'open',
      'event.kind': 'signal',
      'event.action': 'open',
    });
    expect(source['kibana.space_ids']).toContain('default');
    expect(source['kibana.alert.rule.tags']).toContain('infrastructure');
    expect(source.tags).toContain('infrastructure');
    expect(source['kibana.alert.rule.parameters']).toStrictEqual({
      criteria: [
        {
          aggType: 'avg',
          comparator: '>',
          threshold: [0.5],
          timeSize: 5,
          timeUnit: 'm',
          metric: 'system.cpu.user.pct',
        },
      ],
      sourceId: 'default',
      alertOnNoData: true,
      alertOnGroupDisappear: true,
    });
  });

  apiTest('should set correct action parameter: ruleType', async ({ esClient }) => {
    let source: { ruleType?: string; alertDetailsUrl?: string; reason?: string } = {};
    await pollUntilTrue(
      async () => {
        const resp = await esClient.search<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
        }>({
          index: ALERT_ACTION_INDEX,
          ignore_unavailable: true,
        });
        if (resp.hits.hits.length === 0) {
          return false;
        }
        source = resp.hits.hits[0]._source ?? {};
        return true;
      },
      { timeoutMs: 120_000, intervalMs: 3_000, label: 'metric threshold action document' }
    );

    expect(source.ruleType).toBe('metrics.alert.threshold');
    // The host/port of the public base URL differs between FTR and Scout, so we
    // assert the alert details path + id rather than the full absolute URL.
    expect(source.alertDetailsUrl).toContain(`/app/observability/alerts/${alertId}`);
    expect(source.reason).toBe(
      'system.cpu.user.pct is 90% in the last 5 mins. Alert when above 50%.'
    );
  });

  apiTest('should create rule with noDataBehavior: recover', async ({ apiClient }) => {
    const rule = await createMetricThresholdRule(apiClient, headers, {
      name: 'Metric threshold rule with noDataBehavior recover',
      params: {
        criteria: baseCriteria,
        sourceId: 'default',
        alertOnNoData: false,
        noDataBehavior: 'recover',
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBe('recover');
  });

  apiTest('should create rule with noDataBehavior: alertOnNoData', async ({ apiClient }) => {
    const rule = await createMetricThresholdRule(apiClient, headers, {
      name: 'Metric threshold rule with noDataBehavior alertOnNoData',
      params: {
        criteria: baseCriteria,
        sourceId: 'default',
        alertOnNoData: true,
        noDataBehavior: 'alertOnNoData',
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBe('alertOnNoData');
  });

  apiTest('should create rule with noDataBehavior: remainActive', async ({ apiClient }) => {
    const rule = await createMetricThresholdRule(apiClient, headers, {
      name: 'Metric threshold rule with noDataBehavior remainActive',
      params: {
        criteria: baseCriteria,
        sourceId: 'default',
        alertOnNoData: false,
        noDataBehavior: 'remainActive',
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBe('remainActive');
  });

  apiTest('should update existing rule to add noDataBehavior parameter', async ({ apiClient }) => {
    const rule = await createMetricThresholdRule(apiClient, headers, {
      name: 'Metric threshold rule without noDataBehavior',
      params: {
        criteria: baseCriteria,
        sourceId: 'default',
        alertOnNoData: true,
        alertOnGroupDisappear: true,
      },
    });
    transientRuleIds.push(rule.id);
    expect(rule.params.noDataBehavior).toBeUndefined();

    const updateRes = await apiClient.put(`api/alerting/rule/${rule.id}`, {
      headers,
      responseType: 'json',
      body: {
        name: 'Metric threshold rule with noDataBehavior',
        schedule: { interval: '1m' },
        tags: ['infrastructure'],
        actions: [],
        params: {
          criteria: baseCriteria,
          sourceId: 'default',
          alertOnNoData: false,
          noDataBehavior: 'remainActive',
        },
      },
    });
    expect(updateRes).toHaveStatusCode(200);
    expect((updateRes.body as RuleResponse).params.noDataBehavior).toBe('remainActive');
  });
});
