/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import {
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_BULK_ACTION_URL,
  ALERTS_INDEX,
} from './correlation_perf_constants';

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

export const seedTestDocuments = async (
  esClient: EsClient,
  index: string,
  count: number,
  hostCount: number
): Promise<void> => {
  const now = Date.now();
  const fiveMinutesMs = 5 * 60 * 1000;

  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const batchEnd = Math.min(offset + BATCH_SIZE, count);
    const operations: Array<Record<string, unknown>> = [];

    for (let i = offset; i < batchEnd; i++) {
      const timestamp = new Date(now - Math.floor(Math.random() * fiveMinutesMs)).toISOString();
      operations.push({ index: { _index: index } });
      operations.push({
        '@timestamp': timestamp,
        host: { name: `host-${i % hostCount}` },
        event: { kind: 'signal', category: ['process'], action: 'process_started' },
        process: { name: `proc-${i}`, pid: 1000 + i },
        message: `Correlation perf test document ${i}`,
      });
    }

    await esClient.bulk({ operations, refresh: false });
  }

  await esClient.indices.refresh({ index });
};

export const createSourceQueryRule = async (
  apiClient: ApiClient,
  headers: Record<string, string>,
  ruleId: string,
  index: string
): Promise<string> => {
  const response = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
    headers,
    responseType: 'json',
    body: {
      rule_id: ruleId,
      name: `Perf source rule ${ruleId}`,
      description: 'Source query rule for correlation performance testing',
      type: 'query',
      query: '*:*',
      index: [index],
      severity: 'low',
      risk_score: 10,
      interval: '1m',
      from: 'now-10m',
      enabled: true,
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to create rule ${ruleId}: ${response.statusCode} – ${JSON.stringify(response.body)}`
    );
  }

  return response.body.id as string;
};

export const waitForAlerts = async (
  esClient: EsClient,
  minCount: number,
  timeoutMs: number = 120_000,
  ruleIdPrefix?: string
): Promise<number> => {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const query = ruleIdPrefix
        ? {
            bool: {
              filter: [{ prefix: { 'kibana.alert.rule.parameters.rule_id': ruleIdPrefix } }],
            },
          }
        : { match_all: {} };
      const result = await esClient.count({ index: ALERTS_INDEX, query });
      if (result.count >= minCount) {
        return result.count;
      }
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('index_not_found'))) {
        throw e;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const finalCount = await esClient.count({ index: ALERTS_INDEX }).catch(() => ({ count: 0 }));
  throw new Error(
    `Timed out waiting for ${minCount} alerts after ${timeoutMs}ms. Got ${finalCount.count}.`
  );
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
  headers: Record<string, string>,
  testIndex: string
): Promise<void> => {
  // Delete all detection rules via bulk action
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

  // Delete test documents index
  try {
    await esClient.indices.delete({ index: testIndex, ignore_unavailable: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Index cleanup failed:', (e as Error).message);
  }

  // Delete generated alerts
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
