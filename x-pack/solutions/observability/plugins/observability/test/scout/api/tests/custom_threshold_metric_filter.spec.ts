/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { Client } from '@elastic/elasticsearch';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import { getAdminHeaders, type RuleResponse } from '../fixtures/helpers';
import { retryForSuccess } from '../fixtures/poll';

/**
 *
 * A KQL filter set on a metric must scope every aggregation.
 * The rule looks at the last 5 minutes (and the 5 minutes before that for `rate`).
 * Documents with status 500 and status 200 are built so that every aggregation
 * returns a different value when the filter is applied than when it is ignored:
 *
 *   time    status  metric  counter
 *   -8m     500     100     100      <- rate: first half
 *   -7m     200     10      500      <- rate: first half
 *   -2m     500     100     400      <- rate: second half, last 5 minutes
 *   -1m     200     10      1000     <- last 5 minutes (latest document)
 *   -90s    200     10      1000     <- last 5 minutes
 *   -80s    200     10      1000     <- last 5 minutes
 *
 *   aggregation  filtered (status: 500)  unfiltered
 *   avg          100                     32.5
 *   median       100                     10
 *   last_value   100                     10
 *   rate         (400 - 100) / 300 = 1   (1000 - 500) / 300 = 1.67
 */

// Unique per run so leftovers from an aborted run can't collide with this one.
const RUN_ID = randomUUID().slice(0, 8);
const INDEX_NAME = `kbn-scout-custom-threshold-metric-filter-${RUN_ID}`;
const DATA_VIEW_ID = `scout-custom-threshold-metric-filter-${RUN_ID}`;
const ALERTS_INDEX = '.alerts-observability.threshold.alerts-default';
const KQL_FILTER = 'status: 500';

const DOCS = [
  { offsetMs: 8 * 60_000, status: '500', metric: 100, counter: 100 },
  { offsetMs: 7 * 60_000, status: '200', metric: 10, counter: 500 },
  { offsetMs: 2 * 60_000, status: '500', metric: 100, counter: 400 },
  { offsetMs: 60_000, status: '200', metric: 10, counter: 1000 },
  { offsetMs: 90_000, status: '200', metric: 10, counter: 1000 },
  { offsetMs: 80_000, status: '200', metric: 10, counter: 1000 },
];

const FILTERED_CASES = [
  { aggType: Aggregators.AVERAGE, field: 'metric', expectedValue: 100 },
  { aggType: Aggregators.MED, field: 'metric', expectedValue: 100 },
  { aggType: Aggregators.LAST_VALUE, field: 'metric', expectedValue: 100 },
  { aggType: Aggregators.RATE, field: 'counter', expectedValue: 1 },
];

const createRule = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  { aggType, field, filter }: { aggType: Aggregators; field: string; filter?: string }
): Promise<string> => {
  const res = await apiClient.post('api/alerting/rule', {
    headers,
    responseType: 'json',
    body: {
      name: `Metric filter - ${aggType}${filter ? ' - filtered' : ''}`,
      rule_type_id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
      consumer: 'logs',
      tags: ['observability'],
      schedule: { interval: '1m' },
      actions: [],
      params: {
        criteria: [
          {
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            timeSize: 5,
            timeUnit: 'm',
            metrics: [{ name: 'A', aggType, field, ...(filter ? { filter } : {}) }],
          },
        ],
        alertOnNoData: false,
        alertOnGroupDisappear: false,
        searchConfiguration: {
          query: { query: '', language: 'kuery' },
          index: DATA_VIEW_ID,
        },
      },
    },
  });
  expect(res).toHaveStatusCode(200);
  return (res.body as RuleResponse).id;
};

// The rule evaluates "the last N minutes" relative to when it runs, so the documents are re-seeded
// before every test to keep them inside the evaluated windows.
const seedDocs = async (esClient: Client) => {
  await esClient.deleteByQuery({
    index: INDEX_NAME,
    query: { match_all: {} },
    refresh: true,
    conflicts: 'proceed',
  });
  const now = Date.now();
  await esClient.bulk({
    refresh: true,
    operations: DOCS.flatMap(({ offsetMs, status, metric, counter }) => [
      { index: { _index: INDEX_NAME } },
      { '@timestamp': new Date(now - offsetMs).toISOString(), status, metric, counter },
    ]),
  });
};

const waitForEvaluationValue = (esClient: Client, ruleId: string) =>
  retryForSuccess(
    async () => {
      const response = await esClient.search({
        index: ALERTS_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        ignore_unavailable: true,
      });
      const [hit] = response.hits.hits;
      if (!hit) {
        throw new Error('the rule has not raised an alert yet');
      }
      // One value per criterion; these rules have a single criterion.
      const values = (hit._source as Record<string, unknown>)['kibana.alert.evaluation.values'];
      return Array.isArray(values) ? values[0] : undefined;
    },
    { timeoutMs: 90_000, intervalMs: 2_000, label: `alert for rule ${ruleId}` }
  );

apiTest.describe(
  'Custom Threshold rule - metric KQL filter',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let headers: Record<string, string>;
    const ruleIds: string[] = [];

    apiTest.beforeAll(async ({ apiClient, esClient, requestAuth }) => {
      headers = await getAdminHeaders(requestAuth);

      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            status: { type: 'keyword' },
            metric: { type: 'double' },
            counter: { type: 'double' },
          },
        },
      });

      const dataViewRes = await apiClient.post('api/content_management/rpc/create', {
        headers,
        responseType: 'json',
        body: {
          contentTypeId: 'index-pattern',
          data: {
            fieldAttrs: '{}',
            title: INDEX_NAME,
            timeFieldName: '@timestamp',
            sourceFilters: '[]',
            fields: '[]',
            fieldFormatMap: '{}',
            typeMeta: '{}',
            runtimeFieldMap: '{}',
            name: INDEX_NAME,
          },
          options: { id: DATA_VIEW_ID },
          version: 1,
        },
      });
      expect(dataViewRes).toHaveStatusCode(200);
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await seedDocs(esClient);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      for (const ruleId of ruleIds) {
        await apiClient.delete(`api/alerting/rule/${ruleId}`, { headers });
        await esClient.deleteByQuery({
          index: ALERTS_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': ruleId } },
          conflicts: 'proceed',
          ignore_unavailable: true,
        });
      }
      await apiClient.post('api/content_management/rpc/delete', {
        headers,
        responseType: 'json',
        body: {
          contentTypeId: 'index-pattern',
          id: DATA_VIEW_ID,
          options: { force: true },
          version: 1,
        },
      });
      await esClient.indices.delete({ index: INDEX_NAME, ignore_unavailable: true });
    });

    for (const { aggType, field, expectedValue } of FILTERED_CASES) {
      apiTest(
        `${aggType}: evaluates only the documents matching the KQL filter`,
        async ({ apiClient, esClient }) => {
          const ruleId = await createRule(apiClient, headers, {
            aggType,
            field,
            filter: KQL_FILTER,
          });
          ruleIds.push(ruleId);

          expect(await waitForEvaluationValue(esClient, ruleId)).toBe(expectedValue);
        }
      );
    }

    apiTest(
      'avg: still evaluates all documents when there is no filter',
      async ({ apiClient, esClient }) => {
        const ruleId = await createRule(apiClient, headers, {
          aggType: Aggregators.AVERAGE,
          field: 'metric',
        });
        ruleIds.push(ruleId);

        expect(await waitForEvaluationValue(esClient, ruleId)).toBe(32.5);
      }
    );
  }
);
