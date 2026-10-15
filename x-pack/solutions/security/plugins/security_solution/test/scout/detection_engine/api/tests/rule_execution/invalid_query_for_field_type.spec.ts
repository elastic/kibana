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
 * field) fails with the Elasticsearch query_shard_exception reason surfaced in the rule's
 * execution summary. These are the message shapes classified as user errors by
 * `USER_ERROR_REASON_SUBSTRINGS` in `check_error_details.ts`; the classification itself is
 * covered by unit tests, this suite proves ES emits the strings the classifier matches.
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

apiTest.describe(
  'Detection rules with invalid queries for the target field type',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    const runId = randomUUID().slice(0, 8);
    // The index name must match a pattern the serverless security `editor` role (the privileged
    // user) can read, e.g. `filebeat-*` — arbitrary index names resolve to zero readable shards
    // for the rule owner on serverless and the rule ends in `partial failure` instead of
    // reaching the invalid-query failure. `logs-*` is unsuitable because the built-in data
    // stream template rejects explicit index creation.
    const sourceIndex = `filebeat-scout-invalid-query-${runId}`;
    const createdRuleIds: string[] = [];

    let requestHeaders: Record<string, string>;
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
        headers: requestHeaders,
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
              headers: requestHeaders,
              responseType: 'json',
            });
            // Throwing inside expect.poll aborts polling instead of retrying, so a non-200
            // response is returned as a value: it fails the current attempt, keeps polling
            // through transient errors, and surfaces the API error in the timeout message.
            if (response.statusCode !== 200) {
              return `status ${response.statusCode}: ${JSON.stringify(response.body)}`;
            }
            lastExecution = (response.body as RuleResponse).execution_summary;

            return lastExecution?.last_execution.status;
          },
          { timeout: 120_000, intervals: [2_000] }
        )
        .toBe('failed');

      return lastExecution;
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

      const { apiKeyHeader } = await requestAuth.getApiKeyForPrivilegedUser();
      requestHeaders = { ...apiKeyHeader, ...PUBLIC_HEADERS };

      prefixQueryRuleId = await createRule(apiClient, { query: 'destination.ip: 10.*' });
      ipLiteralRuleId = await createRule(apiClient, { query: 'destination.ip: exists' });
    });

    apiTest.afterAll(async ({ esClient, kbnClient }) => {
      // Attempt every deletion even if one fails, so a single cleanup error cannot leave
      // enabled rules failing every minute in a shared environment.
      const results = await Promise.allSettled([
        ...createdRuleIds.map((id) =>
          kbnClient.request({
            method: 'DELETE',
            path: `${DETECTION_ENGINE_RULES_URL}?id=${id}`,
            headers: PUBLIC_HEADERS,
            ignoreErrors: [404],
          })
        ),
        esClient.indices.delete({ index: sourceIndex }, { ignore: [404] }),
      ]);
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(({ reason }) => String(reason));
      expect(failures, failures.join('\n')).toHaveLength(0);
    });

    apiTest(
      'prefix query on an ip field fails with query_shard_exception',
      async ({ apiClient }) => {
        // The default Scout test timeout is shorter than the execution poll window.
        apiTest.setTimeout(150_000);
        const executionSummary = await waitForFailedExecution(apiClient, prefixQueryRuleId);

        expect(executionSummary?.last_execution.status).toBe('failed');
        expect(executionSummary?.last_execution.message).toContain(
          'Can only use prefix queries on keyword, text and wildcard fields'
        );
        expect(executionSummary?.last_execution.message).toContain('[destination.ip]');
      }
    );

    apiTest(
      'IP literal query on an ip field fails with "is not an IP string literal"',
      async ({ apiClient }) => {
        // The default Scout test timeout is shorter than the execution poll window.
        apiTest.setTimeout(150_000);
        const executionSummary = await waitForFailedExecution(apiClient, ipLiteralRuleId);

        expect(executionSummary?.last_execution.status).toBe('failed');
        expect(executionSummary?.last_execution.message).toContain('is not an IP string literal');
      }
    );
  }
);
