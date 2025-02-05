/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';
import { twoMinute } from '../fixtures/duration';
import {
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
  createTimesliceMetricIndicator,
} from '../fixtures/slo';
import { TimesliceMetricTransformGenerator } from './timeslice_metric';

const SPACE_ID = 'custom-space';
const generator = new TimesliceMetricTransformGenerator(SPACE_ID, dataViewsService, false);
const everythingIndicator = createTimesliceMetricIndicator(
  [
    { name: 'A', aggregation: 'avg', field: 'test.field', filter: 'test.category: "test"' },
    { name: 'B', aggregation: 'doc_count', filter: 'test.category: "test"' },
    { name: 'C', aggregation: 'last_value', field: 'test.field' },
    { name: 'D', aggregation: 'std_deviation', field: 'test.field' },
    { name: 'E', aggregation: 'percentile', field: 'test.field', percentile: 97 },
  ],
  '(A + B + C + D + E) / B',
  'test.category: "test"'
);

describe('Timeslice Metric Transform Generator', () => {
  describe('validation', () => {
    it('throws when the budgeting method is occurrences', async () => {
      const anSLO = createSLO({
        indicator: createTimesliceMetricIndicator(
          [{ name: 'A', aggregation: 'avg', field: 'test.field' }],
          '(A / 200) + A'
        ),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(
        'The sli.metric.timeslice indicator MUST have a timeslice budgeting method.'
      );
    });
    it('throws when the metric equation is invalid', async () => {
      const anSLO = createSLOWithTimeslicesBudgetingMethod({
        indicator: createTimesliceMetricIndicator(
          [{ name: 'A', aggregation: 'avg', field: 'test.field' }],
          '(a / 200) + A'
        ),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid equation/);
    });
    it('throws when the metric filter is invalid', async () => {
      const anSLO = createSLOWithTimeslicesBudgetingMethod({
        indicator: createTimesliceMetricIndicator(
          [{ name: 'A', aggregation: 'avg', field: 'test.field', filter: 'test:' }],
          '(A / 200) + A'
        ),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL: test:/);
    });
    it('throws when the query_filter is invalid', async () => {
      const anSLO = createSLOWithTimeslicesBudgetingMethod({
        indicator: createTimesliceMetricIndicator(
          [{ name: 'A', aggregation: 'avg', field: 'test.field', filter: 'test.category: "test"' }],
          '(A / 200) + A',
          'test:'
        ),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: everythingIndicator,
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: everythingIndicator,
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      indicator: everythingIndicator,
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      indicator: {
        ...everythingIndicator,
        params: { ...everythingIndicator.params, index: 'my-own-index*' },
      },
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      indicator: {
        ...everythingIndicator,
        params: { ...everythingIndicator.params, timestampField: 'my-date-field' },
      },
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.sync?.time?.field).toBe('my-date-field');
    // @ts-ignore
    expect(transform.pivot?.group_by['@timestamp'].date_histogram.field).toBe('my-date-field');
  });

  it('aggregates using the _metric equation', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      indicator: everythingIndicator,
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!._metric).toEqual({
      bucket_script: {
        buckets_path: {
          A: '_A>metric',
          B: '_B>_count',
          C: '_C>metric[test.field]',
          D: '_D>metric[std_deviation]',
          E: '_E>metric[97]',
        },
        script: {
          lang: 'painless',
          source: '(params.A + params.B + params.C + params.D + params.E) / params.B',
        },
      },
    });
    expect(transform.pivot!.aggregations!['slo.numerator']).toEqual({
      bucket_script: {
        buckets_path: {
          value: '_metric>value',
        },
        script: {
          params: {
            threshold: 100,
          },
          source: 'params.value >= params.threshold ? 1 : 0',
        },
      },
    });
    expect(transform.pivot!.aggregations!['slo.denominator']).toEqual({
      bucket_script: {
        buckets_path: {},
        script: '1',
      },
    });
  });

  it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
    const slo = createSLOWithTimeslicesBudgetingMethod({
      indicator: everythingIndicator,
      settings: {
        frequency: twoMinute(),
        syncDelay: twoMinute(),
        preventInitialBackfill: true,
      },
    });

    const transform = await generator.getTransformParams(slo);

    // @ts-ignore
    const rangeFilter = transform.source.query.bool.filter.find((f) => 'range' in f);

    expect(rangeFilter).toEqual({
      range: {
        '@timestamp': {
          gte: 'now-360s/m', // 2m + 2m + 2m slice window
        },
      },
    });
  });
});
