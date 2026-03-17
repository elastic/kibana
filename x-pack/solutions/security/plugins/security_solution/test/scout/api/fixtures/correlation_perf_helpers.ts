/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { v4 as uuidv4 } from 'uuid';
import { DETECTION_ENGINE_RULES_BULK_ACTION_URL, ALERTS_INDEX } from './correlation_perf_constants';

const BATCH_SIZE = 500;

export interface ApiClient {
  post(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body: unknown;
    }
  ): Promise<{ statusCode: number; body: Record<string, unknown> }>;

  delete(
    url: string,
    options: {
      headers: Record<string, string>;
      responseType: 'json';
      body?: unknown;
    }
  ): Promise<{ statusCode: number; body: Record<string, unknown> }>;
}

export const seedSyntheticAlerts = async (
  esClient: EsClient,
  alertCount: number,
  hostCount: number,
  sourceRuleIds: string[]
): Promise<void> => {
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;

  for (let offset = 0; offset < alertCount; offset += BATCH_SIZE) {
    const batchEnd = Math.min(offset + BATCH_SIZE, alertCount);
    const operations: Array<Record<string, unknown>> = [];

    for (let i = offset; i < batchEnd; i++) {
      const timestamp = new Date(now - Math.floor(Math.random() * fiveMinutesMs)).toISOString();
      const ruleId = sourceRuleIds[i % sourceRuleIds.length];
      const alertUuid = uuidv4();

      operations.push({ index: { _index: ALERTS_INDEX, _id: alertUuid } });
      operations.push({
        '@timestamp': timestamp,
        'kibana.alert.uuid': alertUuid,
        'kibana.alert.rule.uuid': ruleId,
        'kibana.alert.rule.name': `Perf source rule ${ruleId}`,
        'kibana.alert.rule.type': 'query',
        'kibana.alert.severity': 'low',
        'kibana.alert.risk_score': 10,
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.space_ids': ['default'],
        'host.name': `host-${i % hostCount}`,
        'event.kind': 'signal',
        'event.action': 'process_started',
      });
    }

    await esClient.bulk({ operations, refresh: false });
  }

  await esClient.indices.refresh({ index: ALERTS_INDEX });
};

export const buildCorrelationRule = (params: {
  sourceRuleIds: string[];
  groupBy: string[];
  timespan: string;
  correlationType: string;
}): Record<string, unknown> => {
  return {
    name: 'Perf correlation rule',
    description: 'Correlation rule for performance testing',
    type: 'correlation',
    language: 'esql',
    query: `FROM ${ALERTS_INDEX} METADATA _id, _index`,
    severity: 'high',
    risk_score: 50,
    interval: '5m',
    from: 'now-30m',
    correlation: {
      rules: params.sourceRuleIds,
      type: params.correlationType,
      group_by: params.groupBy,
      timespan: params.timespan,
    },
  };
};

export const cleanupAll = async (
  apiClient: ApiClient,
  esClient: EsClient,
  headers: Record<string, string>
): Promise<void> => {
  try {
    await apiClient.post(DETECTION_ENGINE_RULES_BULK_ACTION_URL, {
      headers,
      responseType: 'json',
      body: {
        action: 'delete',
        query: '',
      },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Rule cleanup failed:', (e as Error).message);
  }

  try {
    await esClient.deleteByQuery({
      index: ALERTS_INDEX,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Alert cleanup failed:', (e as Error).message);
  }
};
