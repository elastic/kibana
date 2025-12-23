/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApiServicesFixture, KbnClient, ScoutLogger } from '@kbn/scout-oblt';
import type { ApmFields, LogDocument } from '@kbn/synthtrace-client';
import type { SynthtraceEsClient } from '@kbn/synthtrace/src/lib/shared/base_client';
import { apm, log, timerange } from '@kbn/synthtrace-client';

export const TEST_START_DATE = '2024-01-01T00:00:00.000Z';
export const TEST_END_DATE = '2024-01-01T01:00:00.000Z';

// Make sure you have a prefix that makes sure that rules show up first in the list.
export const RULE_NAMES = {
  FIRST_RULE_TEST: '!!! - Scout - First Rule Test',
} as const;

// Data view constants for custom threshold tests
export const DATA_VIEWS = {
  FILEBEAT: {
    ID: 'data-view-id_1',
    NAME: 'test-data-view-name_1',
    TITLE: 'filebeat-*',
  },
  METRICBEAT: {
    ID: 'data-view-id_2',
    NAME: 'test-data-view-name_2',
    TITLE: 'metricbeat-*',
  },
} as const;

/**
 * Create a data view via API
 */
export async function createDataView({
  kbnClient,
  log: logger,
  id,
  name,
  title,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  id: string;
  name: string;
  title: string;
}): Promise<void> {
  try {
    await kbnClient.request({
      method: 'POST',
      path: '/api/content_management/rpc/create',
      body: {
        contentTypeId: 'index-pattern',
        data: {
          fieldAttrs: '{}',
          title,
          timeFieldName: '@timestamp',
          sourceFilters: '[]',
          fields: '[]',
          fieldFormatMap: '{}',
          typeMeta: '{}',
          runtimeFieldMap: '{}',
          name,
        },
        options: { id },
        version: 1,
      },
    });
    logger.info(`Created data view: ${name} (${id})`);
  } catch (error) {
    // Data view might already exist, which is fine
    logger.debug(`Data view creation result for ${name}: ${error}`);
  }
}

/**
 * Delete a data view via API
 */
export async function deleteDataView({
  kbnClient,
  log: logger,
  id,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  id: string;
}): Promise<void> {
  try {
    await kbnClient.request({
      method: 'DELETE',
      path: `/api/data_views/data_view/${id}`,
    });
    logger.info(`Deleted data view: ${id}`);
  } catch (error) {
    // Data view might not exist, which is fine
    logger.debug(`Data view deletion result for ${id}: ${error}`);
  }
}

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
