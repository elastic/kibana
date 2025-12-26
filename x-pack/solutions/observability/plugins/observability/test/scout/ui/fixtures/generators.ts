/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApiServicesFixture, EsClient } from '@kbn/scout-oblt';
import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import type { SynthtraceEsClient } from '@kbn/synthtrace/src/lib/shared/base_client';
import { apm, log, timerange } from '@kbn/synthtrace-client';

export const TEST_START_DATE = '2024-01-01T00:00:00.000Z';
export const TEST_END_DATE = '2024-01-01T01:00:00.000Z';

// Make sure you have a prefix that makes sure that rules show up first in the list.
export const RULE_NAMES = {
  FIRST_RULE_TEST: '!!! - Scout - First Rule Test',
} as const;

/**
 * Generate synthetic logs data for testing
 */
export async function generateLogsData({
  from,
  to,
  client,
}: {
  from: number;
  to: number;
  client: Pick<SynthtraceEsClient<LogDocument>, 'index'>;
}): Promise<void> {
  const range = timerange(from, to);

  const generator = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      log
        .create()
        .message('Test log message')
        .timestamp(timestamp)
        .dataset('synth.test')
        .namespace('default')
        .logLevel(Math.random() > 0.5 ? 'info' : 'warn')
        .defaults({
          'service.name': 'test-service',
        })
    );

  await client.index(generator);
}

/**
 * Generate synthetic APM data for testing
 */
export async function generateApmData({
  from,
  to,
  client,
}: {
  from: number;
  to: number;
  client: Pick<SynthtraceEsClient<ApmFields>, 'index'>;
}): Promise<void> {
  const range = timerange(from, to);

  const generator = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      apm
        .service({ name: 'test-service-1', environment: 'test', agentName: 'nodejs' })
        .instance('instance-1')
        .transaction({ transactionName: 'GET /api/test' })
        .timestamp(timestamp)
        .duration(100)
        .success()
    );

  await client.index(generator);
}

// En generators.ts

export async function generateAlertsData({
  esClient,
  alertId,
  ruleName,
  spaceId = 'default',
}: {
  esClient: EsClient;
  alertId: string;
  ruleName: string;
  spaceId?: string;
}): Promise<void> {
  const alerts = [
    {
      _index: '.internal.alerts-observability.metrics.alerts-default-000001',
      _id: alertId,
      _score: 1,
      _source: {
        '@timestamp': new Date().toISOString(),
        'kibana.alert.rule.execution.timestamp': new Date().toISOString(),
        'kibana.alert.original_time_range': {
          gte: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          lte: new Date().toISOString(),
        },
        'kibana.alert.time_range': {
          gte: new Date().toISOString(),
          lte: new Date().toISOString(),
        },
        'kibana.alert.start': new Date().toISOString(),
        'kibana.alert.end': new Date().toISOString(),
        'event.action': 'active',
        'kibana.alert.status': 'active',
        'kibana.alert.url':
          '/app/management/insightsAndAlerting/triggersActions/rule/854ebba1-c0c1-4ac1-88c0-72442d1137b2',
        'kibana.alert.reason': 'Alert reason',
        'kibana.alert.evaluation.conditions': 'Number of matching documents is NOT less than 0',
        'kibana.alert.evaluation.value': '0',
        'kibana.alert.evaluation.threshold': 0,
        'kibana.alert.rule.category': 'Metric threshold',
        'kibana.alert.rule.consumer': 'alerts',
        'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
        'kibana.alert.rule.execution.uuid': 'cc72b66d9-1557-4869-b5ed-20bd567e5ec4',
        'kibana.alert.rule.name': ruleName,
        'kibana.alert.rule.parameters': {},
        'kibana.alert.rule.producer': 'stackAlerts',
        'kibana.alert.rule.revision': 0,
        'kibana.alert.rule.tags': [],
        'kibana.alert.rule.uuid': '854ebba1-c0c1-4ac1-88c0-72442d1137b2',
        'kibana.space_ids': [spaceId],
        'event.kind': 'signal',
        'kibana.alert.action_group': 'recovered',
        'kibana.alert.flapping': false,
        'kibana.alert.flapping_history': [true, false, true, false],
        'kibana.alert.instance.id': 'query matched',
        'kibana.alert.maintenance_window_ids': [],
        'kibana.alert.consecutive_matches': 0,
        'kibana.alert.pending_recovered_count': 0,
        'kibana.alert.uuid': alertId,
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.duration.us': 120021000,
        'kibana.version': '9.4.0',
        tags: [],
        'kibana.alert.previous_action_group': 'recovered',
      },
    },
  ];

  await esClient.bulk({
    refresh: 'true',
    operations: alerts.flatMap(({ _index, _id, _source: doc }) => [
      { index: { _index, _id } },
      doc,
    ]),
  });
}
/**
 * Generate test rules for rules page tests
 */
export async function generateRulesData(apiServices: ApiServicesFixture) {
  const allRuleNames = Object.values(RULE_NAMES);
  const RuleNamesQuery = allRuleNames.join(' OR ');
  const existingRules = await apiServices.alerting.rules.find({ search: RuleNamesQuery });
  const existingRuleNames = new Set(
    existingRules?.data?.data?.map((r: { name: string }) => r.name) ?? []
  );

  const filteredRuleNames = allRuleNames.filter((name) => !existingRuleNames.has(name));

  for (const ruleName of filteredRuleNames) {
    await apiServices.alerting.rules.create({
      name: ruleName,
      ruleTypeId: 'observability.rules.custom_threshold',
      consumer: 'alerts',
      params: {
        criteria: [
          {
            comparator: '>',
            metrics: [{ name: 'A', aggType: 'count' }],
            threshold: [200000],
            timeSize: 1,
            timeUnit: 'm',
          },
        ],
        alertOnNoData: false,
        alertOnGroupDisappear: false,
        searchConfiguration: {
          query: { query: '', language: 'kuery' },
          index: 'remote_cluster:logs-*',
        },
      },
      schedule: { interval: '1m' },
      actions: [],
    });
  }
}
