/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { CreateSLOInput, TimesliceMetricIndicator } from '@kbn/slo-schema';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../../../common/constants';
import { apiTest, mergeSloApiHeaders, pollUntilTrue } from '../fixtures';

const SOURCE_INDEX = 'slo-exponential-histogram-test';
const DOC_COUNT = 30;
const ROLLUP_POLL_TIMEOUT_MS = 180_000;
const TEST_TIMEOUT_MS = ROLLUP_POLL_TIMEOUT_MS + 30_000;

// Scale 0 buckets: index i covers (2^i, 2^(i+1)], so 9 of the 10 values are <= 8 and 1 is in (32, 64].
const LATENCY_HISTOGRAM = {
  scale: 0,
  sum: 50,
  min: 1.5,
  max: 40,
  positive: { indices: [0, 1, 2, 5], counts: [4, 3, 2, 1] },
};
const VALUES_PER_DOC = 10;
const VALUES_UNDER_16_PER_DOC = 9;

const BASE_SLO: Pick<
  CreateSLOInput,
  'description' | 'timeWindow' | 'settings' | 'tags' | 'groupBy'
> = {
  description: 'Fixture for exponential_histogram api integration tests',
  timeWindow: { duration: '7d', type: 'rolling' },
  settings: { frequency: '1m', syncDelay: '1m', preventInitialBackfill: false },
  tags: ['exponential-histogram'],
  groupBy: '*',
};

const HISTOGRAM_SLO: CreateSLOInput = {
  ...BASE_SLO,
  name: 'Histogram SLO on exponential_histogram',
  budgetingMethod: 'occurrences',
  objective: { target: 0.9 },
  indicator: {
    type: 'sli.histogram.custom',
    params: {
      index: SOURCE_INDEX,
      timestampField: '@timestamp',
      filter: '',
      good: { field: 'latency', aggregation: 'range', from: 0, to: 16 },
      total: { field: 'latency', aggregation: 'value_count' },
    },
  },
};

const CUSTOM_METRIC_SLO: CreateSLOInput = {
  ...BASE_SLO,
  name: 'Custom metric SLO on exponential_histogram',
  budgetingMethod: 'occurrences',
  objective: { target: 0.4 },
  indicator: {
    type: 'sli.metric.custom',
    params: {
      index: SOURCE_INDEX,
      timestampField: '@timestamp',
      filter: '',
      good: { metrics: [{ name: 'A', aggregation: 'sum', field: 'latency' }], equation: 'A' },
      total: { metrics: [{ name: 'A', aggregation: 'sum', field: 'latency' }], equation: 'A * 2' },
    },
  },
};

type TimesliceMetric = TimesliceMetricIndicator['params']['metric']['metrics'][number];

const createTimesliceMetricSlo = (metric: TimesliceMetric, threshold: number): CreateSLOInput => ({
  ...BASE_SLO,
  name: `Timeslice metric SLO (${metric.aggregation}) on exponential_histogram`,
  budgetingMethod: 'timeslices',
  objective: { target: 0.9, timesliceTarget: 0.9, timesliceWindow: '1m' },
  indicator: {
    type: 'sli.metric.timeslice',
    params: {
      index: SOURCE_INDEX,
      timestampField: '@timestamp',
      filter: '',
      metric: { metrics: [metric], equation: 'A', comparator: 'GT', threshold },
    },
  },
});

// Each threshold is above 0 and below the expected value, so a slice is good only when the aggregation reads the
// histogram. max and p99 thresholds are also above 8, so reading only the low buckets is not enough.
const TIMESLICE_METRIC_SLOS: CreateSLOInput[] = [
  // avg = sum / count = 50 / 10 = 5
  createTimesliceMetricSlo({ name: 'A', aggregation: 'avg', field: 'latency' }, 4),
  // max = 40
  createTimesliceMetricSlo({ name: 'A', aggregation: 'max', field: 'latency' }, 32),
  // min = 1.5
  createTimesliceMetricSlo({ name: 'A', aggregation: 'min', field: 'latency' }, 1),
  // p99 falls in the (32, 64] bucket, capped at max (40)
  createTimesliceMetricSlo(
    { name: 'A', aggregation: 'percentile', field: 'latency', percentile: 99 },
    16
  ),
];

interface RollupTotals {
  docCount: number;
  numerator: number;
  denominator: number;
  goodSlices: number;
}

const getRollupTotals = async (esClient: EsClient, sloId: string): Promise<RollupTotals> => {
  const response = await esClient.search<
    unknown,
    Record<'numerator' | 'denominator' | 'goodSlices', { value: number }>
  >({
    index: SLI_DESTINATION_INDEX_PATTERN,
    size: 0,
    track_total_hits: true,
    query: { term: { 'slo.id': sloId } },
    aggs: {
      numerator: { sum: { field: 'slo.numerator' } },
      denominator: { sum: { field: 'slo.denominator' } },
      goodSlices: { sum: { field: 'slo.isGoodSlice' } },
    },
  });
  const { total } = response.hits;

  return {
    docCount: typeof total === 'number' ? total : total?.value ?? 0,
    numerator: response.aggregations?.numerator.value ?? 0,
    denominator: response.aggregations?.denominator.value ?? 0,
    goodSlices: response.aggregations?.goodSlices.value ?? 0,
  };
};

const waitForRollupTotals = async (esClient: EsClient, sloId: string): Promise<RollupTotals> => {
  let totals: RollupTotals = { docCount: 0, numerator: 0, denominator: 0, goodSlices: 0 };
  await pollUntilTrue(
    async () => {
      totals = await getRollupTotals(esClient, sloId);
      return totals.docCount === DOC_COUNT;
    },
    {
      timeoutMs: ROLLUP_POLL_TIMEOUT_MS,
      intervalMs: 3000,
      label: `rollup data for SLO ${sloId} did not reach ${DOC_COUNT} documents`,
    }
  );

  return totals;
};

apiTest.describe(
  'SLOs on exponential_histogram fields',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const sloIds = new Map<CreateSLOInput, string>();

    const getSloId = (slo: CreateSLOInput): string => {
      const sloId = sloIds.get(slo);
      if (!sloId) {
        throw new Error(`SLO "${slo.name}" was not created`);
      }
      return sloId;
    };

    apiTest.beforeAll(async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKey('admin');
      const headers = { ...mergeSloApiHeaders(apiKeyHeader), Accept: 'application/json' };

      await esClient.indices.delete({ index: SOURCE_INDEX, ignore_unavailable: true });
      await esClient.indices.create({
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            latency: { type: 'exponential_histogram' },
          },
        },
      });

      const now = Date.now();
      const operations = Array.from({ length: DOC_COUNT }, (_, i) => [
        { index: { _index: SOURCE_INDEX } },
        {
          '@timestamp': new Date(now - (DOC_COUNT + 5 - i) * 60_000).toISOString(),
          latency: LATENCY_HISTOGRAM,
        },
      ]).flat();
      const bulkResponse = await esClient.bulk({ operations, refresh: 'wait_for' });
      expect(bulkResponse.errors).toBe(false);

      await Promise.all(
        [HISTOGRAM_SLO, CUSTOM_METRIC_SLO, ...TIMESLICE_METRIC_SLOS].map(async (slo) => {
          const createResponse = await apiClient.post('api/observability/slos', {
            headers,
            body: slo,
            responseType: 'json',
          });
          expect(createResponse).toHaveStatusCode(200);
          sloIds.set(slo, createResponse.body.id as string);
        })
      );
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      await Promise.all([...sloIds.values()].map((sloId) => apiServices.slo.delete(sloId)));
      await esClient.indices.delete({ index: SOURCE_INDEX, ignore_unavailable: true });
    });

    apiTest(
      'computes a histogram indicator with range and value_count aggregations',
      async ({ esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);

        const totals = await waitForRollupTotals(esClient, getSloId(HISTOGRAM_SLO));

        expect(totals.numerator).toBe(DOC_COUNT * VALUES_UNDER_16_PER_DOC);
        expect(totals.denominator).toBe(DOC_COUNT * VALUES_PER_DOC);
      }
    );

    apiTest('computes a custom metric indicator with a sum aggregation', async ({ esClient }) => {
      apiTest.setTimeout(TEST_TIMEOUT_MS);

      const totals = await waitForRollupTotals(esClient, getSloId(CUSTOM_METRIC_SLO));

      expect(totals.numerator).toBe(DOC_COUNT * LATENCY_HISTOGRAM.sum);
      expect(totals.denominator).toBe(DOC_COUNT * LATENCY_HISTOGRAM.sum * 2);
    });

    for (const slo of TIMESLICE_METRIC_SLOS) {
      apiTest(`computes "${slo.name}"`, async ({ esClient }) => {
        apiTest.setTimeout(TEST_TIMEOUT_MS);

        const totals = await waitForRollupTotals(esClient, getSloId(slo));

        expect(totals.goodSlices).toBe(DOC_COUNT);
      });
    }
  }
);
