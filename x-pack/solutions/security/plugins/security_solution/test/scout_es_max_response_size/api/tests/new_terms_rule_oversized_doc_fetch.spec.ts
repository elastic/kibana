/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  ALERT_RULE_UUID,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_START,
} from '@kbn/rule-data-utils';
import type { KbnClient } from '@kbn/scout-security';
import { ELASTICSEARCH_MAX_RESPONSE_SIZE_BYTES } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { apiTest, tags } from '../fixtures';
import { ALERTS_INDEX, PUBLIC_HEADERS } from '../fixtures/constants';

/**
 * The New Terms rule fetches the source document of every new term in a single request per batch of terms.
 * Every bucket of that response carries the full document, so a document holding an array of many new terms
 * makes the response exceed `elasticsearch.maxResponseSize`. The rule then halves the batch size and retries.
 *
 * With multiple new terms fields the retry must not re-process terms whose alerts were already created,
 * otherwise alert suppression counts the same source documents again and `docs_count` becomes inflated.
 */

interface RuleResponse {
  id: string;
  execution_summary?: {
    last_execution: {
      status: string;
      message: string;
    };
  };
}

interface AlertSource {
  [ALERT_SUPPRESSION_DOCS_COUNT]: number;
  [ALERT_SUPPRESSION_START]: string;
  [ALERT_SUPPRESSION_END]: string;
}

const SMALL_DOCUMENTS_COUNT = 200;
const LARGE_DOCUMENT_TERMS_COUNT = 200;
/**
 * The first document fetch attempt carries LARGE_DOCUMENT_TERMS_COUNT copies of the large document
 * (twice the limit) and fails. The retried half-sized batches carry at most 50 copies (half the limit)
 * and 150 copies (1.5x the limit), so the very first retried batch succeeds while a later one fails again.
 */
const LARGE_DOCUMENT_SIZE_BYTES = Math.ceil(
  (ELASTICSEARCH_MAX_RESPONSE_SIZE_BYTES * 2) / LARGE_DOCUMENT_TERMS_COUNT
);
const SUPPRESSION_GROUP_VALUE = 'constant';
const MAX_RESPONSE_SIZE_WARNING = 'exceeded the "elasticsearch.maxResponseSize" limit';
const FINISHED_EXECUTION_STATUSES = ['succeeded', 'partial failure', 'failed'];

apiTest.describe(
  'New Terms rule with an oversized document fetch response',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    const runId = randomUUID().slice(0, 8);
    const sourceIndex = `scout-new-terms-oversized-${runId}`;
    const createdRuleIds: string[] = [];

    const createRule = async (kbnClient: KbnClient, rule: Record<string, unknown>) => {
      const response = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: DETECTION_ENGINE_RULES_URL,
        headers: PUBLIC_HEADERS,
        body: {
          name: `New Terms oversized doc fetch ${runId}`,
          description: 'Document fetch response exceeds elasticsearch.maxResponseSize',
          type: 'new_terms',
          query: '*:*',
          language: 'kuery',
          index: [sourceIndex],
          severity: 'low',
          risk_score: 1,
          from: 'now-1h',
          interval: '5m',
          history_window_start: 'now-7d',
          enabled: true,
          ...rule,
        },
      });

      createdRuleIds.push(response.data.id);

      return response.data.id;
    };

    const waitForFirstExecution = async (kbnClient: KbnClient, ruleId: string) => {
      let executionSummary: RuleResponse['execution_summary'];

      await expect
        .poll(
          async () => {
            const response = await kbnClient.request<RuleResponse>({
              method: 'GET',
              path: `${DETECTION_ENGINE_RULES_URL}?id=${ruleId}`,
              headers: PUBLIC_HEADERS,
            });

            executionSummary = response.data.execution_summary;

            return executionSummary?.last_execution.status;
          },
          { timeout: 240_000, intervals: [3_000] }
        )
        .toMatch(new RegExp(FINISHED_EXECUTION_STATUSES.join('|')));

      return executionSummary;
    };

    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({
        index: sourceIndex,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            terms_field: { type: 'keyword' },
            other_field: { type: 'keyword' },
            content: { type: 'text', index: false },
          },
        },
      });

      const timestamp = new Date().toISOString();
      const smallDocuments = Array.from({ length: SMALL_DOCUMENTS_COUNT }, (_, index) => ({
        '@timestamp': timestamp,
        terms_field: `a-${String(index).padStart(3, '0')}`,
        other_field: SUPPRESSION_GROUP_VALUE,
        content: 'small',
      }));
      const largeDocument = {
        '@timestamp': timestamp,
        terms_field: Array.from(
          { length: LARGE_DOCUMENT_TERMS_COUNT },
          (_, index) => `z-${String(index).padStart(3, '0')}`
        ),
        other_field: SUPPRESSION_GROUP_VALUE,
        content: 'x'.repeat(LARGE_DOCUMENT_SIZE_BYTES),
      };

      await esClient.bulk({
        refresh: 'wait_for',
        operations: [...smallDocuments, largeDocument].flatMap((document) => [
          { index: { _index: sourceIndex } },
          document,
        ]),
      });
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

      await esClient.deleteByQuery({
        index: ALERTS_INDEX,
        query: { terms: { [ALERT_RULE_UUID]: createdRuleIds } },
        refresh: true,
        ignore_unavailable: true,
      });
      await esClient.indices.delete({ index: sourceIndex }, { ignore: [404] });
    });

    apiTest(
      'counts every source document once in the suppressed alert when there are multiple new terms fields',
      async ({ esClient, kbnClient }) => {
        const ruleId = await createRule(kbnClient, {
          new_terms_fields: ['terms_field', 'other_field'],
          alert_suppression: {
            group_by: ['other_field'],
            duration: { value: 1, unit: 'h' },
            missing_fields_strategy: 'suppress',
          },
        });

        const executionSummary = await waitForFirstExecution(kbnClient, ruleId);

        expect(executionSummary?.last_execution.status).toBe('partial failure');
        expect(executionSummary?.last_execution.message).toContain(MAX_RESPONSE_SIZE_WARNING);

        // Alerts are read from Elasticsearch with a limited `_source` because every alert embeds the large
        // source document, so fetching them through the Kibana alerts API would hit the same response size limit.
        await esClient.indices.refresh({ index: ALERTS_INDEX });
        const alerts = await esClient.search<AlertSource>({
          index: ALERTS_INDEX,
          size: 10,
          _source: [ALERT_SUPPRESSION_DOCS_COUNT, ALERT_SUPPRESSION_START, ALERT_SUPPRESSION_END],
          query: { term: { [ALERT_RULE_UUID]: ruleId } },
        });

        // every new term of both the small documents and the large document is a candidate alert,
        // all of them share the same `other_field` value so they collapse into a single suppressed alert
        const candidateAlertsCount = SMALL_DOCUMENTS_COUNT + LARGE_DOCUMENT_TERMS_COUNT;

        expect(alerts.hits.hits).toHaveLength(1);
        expect(alerts.hits.hits[0]._source?.[ALERT_SUPPRESSION_DOCS_COUNT]).toBe(
          candidateAlertsCount - 1
        );
      }
    );
  }
);
