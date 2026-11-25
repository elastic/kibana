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
import { PUBLIC_HEADERS, getViewIndexMetadataOnlyRole } from '../../fixtures/constants';

/**
 * A rule whose owner holds `view_index_metadata` but not `read` on the source indices matches
 * indices during validation, yet every events search resolves to zero shards and comes back without
 * an `aggregations` object. Cross-project search produces the same response shape when the linked
 * projects exclude indices the owner cannot read. The rule must report that as an actionable
 * partial failure instead of the generic `expected to find aggregations on search result` error.
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

const NO_READABLE_SHARDS_MESSAGE = 'returned no shards for index pattern(s)';
const LEGACY_AGGREGATIONS_ERRORS = [
  'expected to find aggregations on search result',
  'Aggregations were missing',
];

apiTest.describe(
  'Detection rules over source indices without the read privilege',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    const runId = randomUUID().slice(0, 8);
    const sourceIndex = `scout-no-read-source-${runId}`;
    const sourceIndexPattern = `scout-no-read-source-${runId}*`;
    const createdRuleIds: string[] = [];

    let ruleOwnerHeaders: Record<string, string>;

    const baseRule = () => ({
      name: `No readable shards ${runId}`,
      description: 'Rule owner can see the source index but cannot read it',
      severity: 'low',
      risk_score: 1,
      index: [sourceIndexPattern],
      from: 'now-1h',
      interval: '1m',
      enabled: true,
    });

    const createRule = async (
      apiClient: ApiClientFixture,
      rule: Record<string, unknown>
    ): Promise<string> => {
      const response = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
        headers: ruleOwnerHeaders,
        responseType: 'json',
        body: { ...baseRule(), ...rule },
      });

      expect(response.statusCode, JSON.stringify(response.body)).toBe(200);

      const { id } = response.body as RuleResponse;
      createdRuleIds.push(id);

      return id;
    };

    const waitForFirstExecution = async (
      apiClient: ApiClientFixture,
      ruleId: string
    ): Promise<RuleResponse['execution_summary']> => {
      let lastExecution: RuleResponse['execution_summary'];

      await expect
        .poll(
          async () => {
            const response = await apiClient.get(`${DETECTION_ENGINE_RULES_URL}?id=${ruleId}`, {
              headers: ruleOwnerHeaders,
              responseType: 'json',
            });
            lastExecution = (response.body as RuleResponse).execution_summary;

            return lastExecution?.last_execution.status;
          },
          { timeout: 120_000, intervals: [2_000] }
        )
        .toBeDefined();

      return lastExecution;
    };

    const expectNoReadableShardsPartialFailure = (
      executionSummary: RuleResponse['execution_summary']
    ) => {
      expect(executionSummary?.last_execution.status).toBe('partial failure');
      expect(executionSummary?.last_execution.message).toContain(NO_READABLE_SHARDS_MESSAGE);
      expect(executionSummary?.last_execution.message).toContain(sourceIndexPattern);

      for (const legacyError of LEGACY_AGGREGATIONS_ERRORS) {
        expect(executionSummary?.last_execution.message).not.toContain(legacyError);
      }
    };

    apiTest.beforeAll(async ({ esClient, requestAuth }) => {
      await esClient.indices.create({
        index: sourceIndex,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
          },
        },
      });
      await esClient.index({
        index: sourceIndex,
        refresh: 'wait_for',
        document: { '@timestamp': new Date().toISOString(), 'host.name': `host-${runId}` },
      });

      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        getViewIndexMetadataOnlyRole(sourceIndexPattern)
      );
      ruleOwnerHeaders = { ...apiKeyHeader, ...PUBLIC_HEADERS };
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

    apiTest(
      'custom query rule reports a partial failure naming the pattern',
      async ({ apiClient }) => {
        const id = await createRule(apiClient, {
          type: 'query',
          query: '*:*',
          language: 'kuery',
        });

        const executionSummary = await waitForFirstExecution(apiClient, id);

        expectNoReadableShardsPartialFailure(executionSummary);
      }
    );

    apiTest(
      'custom query rule with alert suppression reports a partial failure instead of the aggregations error',
      async ({ apiClient }) => {
        const id = await createRule(apiClient, {
          type: 'query',
          query: '*:*',
          language: 'kuery',
          alert_suppression: { group_by: ['host.name'] },
        });

        const executionSummary = await waitForFirstExecution(apiClient, id);

        expectNoReadableShardsPartialFailure(executionSummary);
      }
    );

    apiTest(
      'threshold rule reports a partial failure instead of the aggregations error',
      async ({ apiClient }) => {
        const id = await createRule(apiClient, {
          type: 'threshold',
          query: '*:*',
          language: 'kuery',
          threshold: { field: ['host.name'], value: 1 },
        });

        const executionSummary = await waitForFirstExecution(apiClient, id);

        expectNoReadableShardsPartialFailure(executionSummary);
      }
    );

    apiTest(
      'new terms rule reports a partial failure instead of the aggregations error',
      async ({ apiClient }) => {
        const id = await createRule(apiClient, {
          type: 'new_terms',
          query: '*:*',
          language: 'kuery',
          new_terms_fields: ['host.name'],
          history_window_start: 'now-7d',
        });

        const executionSummary = await waitForFirstExecution(apiClient, id);

        expectNoReadableShardsPartialFailure(executionSummary);
      }
    );
  }
);
