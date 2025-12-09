/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApiServicesFixture, ScoutLogger } from '@kbn/scout-oblt';
import type { ApmFields, LogDocument, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, log, timerange } from '@kbn/synthtrace-client';

export const TEST_START_DATE = '2024-01-01T00:00:00.000Z';
export const TEST_END_DATE = '2024-01-01T01:00:00.000Z';

export const RULE_NAMES = {
  LOGS_TAB_TEST: 'Scout - Logs Tab Test Rule',
  VIEWER_TEST: 'Scout - Viewer Test Rule',
  ADMIN_TEST: 'Scout - Admin Test Rule',
} as const;

/**
 * Generate synthetic logs data for testing
 */
export function generateLogsData({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<LogDocument> {
  const range = timerange(from, to);

  return range
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
}

/**
 * Generate synthetic APM data for testing
 */
export function generateApmData({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  return range
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
}

/**
 * Generate test rules for rules page tests
 */
export async function generateRulesData(apiServices: ApiServicesFixture, scoutLogger: ScoutLogger) {
  const existingRules = await apiServices.alerting.rules.find({});
  const existingRuleNames = new Set(
    existingRules?.data?.data?.map((r: { name: string }) => r.name) ?? []
  );

  for (const ruleName of Object.values(RULE_NAMES)) {
    if (existingRuleNames.has(ruleName)) {
      scoutLogger.info(`Rule "${ruleName}" already exists`);
      continue;
    }

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
