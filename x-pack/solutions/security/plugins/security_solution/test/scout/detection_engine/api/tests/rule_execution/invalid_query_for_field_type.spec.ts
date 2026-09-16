/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../common/constants';
import { apiTest, tags } from '../../fixtures';
import { PUBLIC_HEADERS } from '../../fixtures/constants';

/**
 * Verifies that a detection rule whose KQL query is semantically invalid for the target
 * field's ES mapping (e.g. a wildcard on an ip field, or a non-IP literal against an ip
 * field) surfaces the Elasticsearch query_shard_exception message in the rule's execution
 * summary and is counted as a USER error — not a framework error — in task manager
 * metrics. This covers the USER_ERROR_REASON_SUBSTRINGS classifier in
 * `check_error_details.ts`.
 */

interface RuleResponse {
  id: string;
  execution_summary?: {
    last_execution: {
      status: string;
      message: string;
      date: string;
    };
  };
}

interface TaskManagerQueryRuleMetrics {
  user_errors: number;
  framework_errors: number;
  total: number;
}

interface TaskManagerMetricsResponse {
  metrics?: {
    task_run?: {
      value: {
        by_type: Record<string, TaskManagerQueryRuleMetrics>;
      };
    };
  };
}

const QUERY_RULE_TYPE_KEY = 'alerting:siem__queryRule';
const TASK_MANAGER_METRICS_PATH = '/api/task_manager/metrics?reset=false';

apiTest.describe(
  'Detection rules with invalid queries for the target field type',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    const runId = randomUUID().slice(0, 8);
    const sourceIndex = `scout-invalid-query-${runId}`;
    const createdRuleIds: string[] = [];

    let adminHeaders: Record<string, string>;
    let baselineUserErrors: number;
    let baselineFrameworkErrors: number;
    let prefixQueryRuleId: string;
    let ipLiteralRuleId: string;

    const baseRule = () => ({
      name: `Invalid query field type ${runId}`,
      description: 'Rule with a query that is semantically invalid for the mapped field type',
      severity: 'low',
      risk_score: 1,
      type: 'query',
      language: 'kuery',
      index: [sourceIndex],
      from: 'now-1h',
      interval: '1m',
      enabled: true,
    });

    const createRule = async (
      apiClient: ApiClientFixture,
      overrides: Record<string, unknown>
    ): Promise<string> => {
      const response = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
        headers: adminHeaders,
        responseType: 'json',
        body: { ...baseRule(), ...overrides },
      });

      expect(response.statusCode, JSON.stringify(response.body)).toBe(200);

      const { id } = response.body as RuleResponse;
      createdRuleIds.push(id);

      return id;
    };

    const waitForFailedExecution = async (
      apiClient: ApiClientFixture,
      ruleId: string
    ): Promise<RuleResponse['execution_summary']> => {
      let lastExecution: RuleResponse['execution_summary'];

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(`${DETECTION_ENGINE_RULES_URL}?id=${ruleId}`, {
              headers: adminHeaders,
              responseType: 'json',
            });
            lastExecution = (response.body as RuleResponse).execution_summary;

            return lastExecution?.last_execution.status;
          },
          { timeout: 120_000, intervals: [2_000] }
        )
        .toBe('failed');

      return lastExecution;
    };

    const readQueryRuleMetrics = async (
      apiClient: ApiClientFixture
    ): Promise<TaskManagerQueryRuleMetrics | undefined> => {
      const response = await apiClient.get(TASK_MANAGER_METRICS_PATH, {
        headers: adminHeaders,
        responseType: 'json',
      });
      const body = response.body as TaskManagerMetricsResponse;
      return body.metrics?.task_run?.value.by_type[QUERY_RULE_TYPE_KEY];
    };

    apiTest.beforeAll(async ({ esClient, apiClient, requestAuth }) => {
      await esClient.indices.create({
        index: sourceIndex,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'destination.ip': { type: 'ip' },
          },
        },
      });
      await esClient.index({
        index: sourceIndex,
        refresh: 'wait_for',
        document: { '@timestamp': new Date().toISOString(), 'destination.ip': '10.0.0.1' },
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      adminHeaders = { ...apiKeyHeader, ...PUBLIC_HEADERS };

      // Capture baseline BEFORE creating any rules so the metrics delta is clean.
      const metrics = await readQueryRuleMetrics(apiClient);
      baselineUserErrors = metrics?.user_errors ?? 0;
      baselineFrameworkErrors = metrics?.framework_errors ?? 0;

      prefixQueryRuleId = await createRule(apiClient, { query: 'destination.ip: 10.*' });
      ipLiteralRuleId = await createRule(apiClient, { query: 'destination.ip: exists' });
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      for (const id of createdRuleIds) {
        await kbnClient.request({
          method: 'DELETE',
          path: `${DETECTION_ENGINE_RULES_URL}?id=${id}`,
          headers: PUBLIC_HEADERS,
          ignoreErrors: [404],
        });
      }
      await esClient.indices.delete({ index: sourceIndex }, { ignore: [404] });
    });

    apiTest('prefix query on an ip field fails as a user error', async ({ apiClient }) => {
      const executionSummary = await waitForFailedExecution(apiClient, prefixQueryRuleId);

      expect(executionSummary?.last_execution.status).toBe('failed');
      expect(executionSummary?.last_execution.message).toContain(
        'Can only use prefix queries on keyword, text and wildcard fields'
      );
      expect(executionSummary?.last_execution.message).toContain('[destination.ip]');
    });

    apiTest('IP literal query on an ip field fails as a user error', async ({ apiClient }) => {
      const executionSummary = await waitForFailedExecution(apiClient, ipLiteralRuleId);

      expect(executionSummary?.last_execution.status).toBe('failed');
      expect(executionSummary?.last_execution.message).toContain('is not an IP string literal');
    });

    apiTest(
      'failed rules with query_shard_exception are counted as user errors, not framework errors, in task manager metrics',
      async ({ apiClient }) => {
        // The per-execution user-error classification is only observable in the process-wide
        // task manager counters (it is not written to the event log or any rule API), so this
        // test asserts deltas on the global `alerting:siem__queryRule` counter after confirming
        // both rules have failed. Waiting for both failures here is idempotent — if the earlier
        // tests already drove them to `failed`, this returns immediately. If the classifier
        // missed these errors they would land in `framework_errors` instead, which the equality
        // assertion below would catch.
        await waitForFailedExecution(apiClient, prefixQueryRuleId);
        await waitForFailedExecution(apiClient, ipLiteralRuleId);

        await expect
          .poll(
            async () => {
              const metrics = await readQueryRuleMetrics(apiClient);
              return metrics?.user_errors ?? 0;
            },
            { timeout: 120_000, intervals: [2_000] }
          )
          .toBeGreaterThanOrEqual(baselineUserErrors + 1);

        const finalMetrics = await readQueryRuleMetrics(apiClient);
        expect(finalMetrics?.framework_errors ?? 0).toBe(baselineFrameworkErrors);
      }
    );
  }
);
