/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { twoMinute } from '../fixtures/duration';
import {
  createMetricCustomIndicator,
  createSLO,
  createSLOWithTimeslicesBudgetingMethod,
} from '../fixtures/slo';
import { MetricCustomTransformGenerator } from './metric_custom';
import { dataViewsService } from '@kbn/data-views-plugin/server/mocks';

const SPACE_ID = 'custom-space';
const generator = new MetricCustomTransformGenerator(SPACE_ID, dataViewsService, false);

describe('Metric Custom Transform Generator', () => {
  describe('validation', () => {
    it('throws when the good equation is invalid', async () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({
          good: {
            metrics: [{ name: 'A', aggregation: 'sum', field: 'good' }],
            equation: 'Math.floor(A / z)',
          },
        }),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid equation/);
    });
    it('throws when the good filter is invalid', async () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({
          good: {
            metrics: [{ name: 'A', aggregation: 'sum', field: 'good', filter: 'foo:' }],
            equation: 'A',
          },
        }),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL: foo:/);
    });
    it('throws when the total equation is invalid', async () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({
          total: {
            metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }],
            equation: 'Math.foo(A)',
          },
        }),
      });
      await expect(generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid equation/);
    });
    it('throws when the total filter is invalid', async () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({
          total: {
            metrics: [{ name: 'A', aggregation: 'sum', field: 'total', filter: 'foo:' }],
            equation: 'A',
          },
        }),
      });
      await expect(() => generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL: foo:/);
    });
    it('throws when the query_filter is invalid', async () => {
      const anSLO = createSLO({
        indicator: createMetricCustomIndicator({ filter: '{ kql.query: invalid' }),
      });
      await expect(() => generator.getTransformParams(anSLO)).rejects.toThrow(/Invalid KQL/);
    });
  });

  it('returns the expected transform params with every specified indicator params', async () => {
    const anSLO = createSLO({ id: 'irrelevant', indicator: createMetricCustomIndicator() });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('returns the expected transform params for timeslices slo', async () => {
    const anSLO = createSLOWithTimeslicesBudgetingMethod({
      id: 'irrelevant',
      indicator: createMetricCustomIndicator(),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform).toMatchSnapshot();
  });

  it('filters the source using the kql query', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({ filter: 'labels.groupId: group-4' }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.source.query).toMatchSnapshot();
  });

  it('uses the provided index', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({ index: 'my-own-index*' }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.source.index).toBe('my-own-index*');
  });

  it('uses the provided timestampField', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        timestampField: 'my-date-field',
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.sync?.time?.field).toBe('my-date-field');
    // @ts-ignore
    expect(transform.pivot?.group_by['@timestamp'].date_histogram.field).toBe('my-date-field');
  });

  it('aggregates using the numerator equation', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        good: {
          metrics: [{ name: 'A', aggregation: 'sum', field: 'good' }],
          equation: 'A * 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('support the same field used twice in the equation', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        good: {
          metrics: [{ name: 'A', aggregation: 'sum', field: 'good' }],
          equation: 'A + A * 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the numerator equation with filter', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        good: {
          metrics: [
            { name: 'A', aggregation: 'sum', field: 'good', filter: 'outcome: "success" ' },
          ],
          equation: 'A * 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using doc_count the numerator equation with filter', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        good: {
          metrics: [{ name: 'A', aggregation: 'doc_count', filter: 'outcome: "success" ' }],
          equation: 'A * 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.numerator']).toMatchSnapshot();
  });

  it('aggregates using the denominator equation', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        total: {
          metrics: [{ name: 'A', aggregation: 'sum', field: 'total' }],
          equation: 'A / 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });

  it('aggregates using the denominator equation with filter', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        total: {
          metrics: [{ name: 'A', aggregation: 'sum', field: 'total', filter: 'outcome: *' }],
          equation: 'A / 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });

  it('aggregates using doc_count for the denominator equation with filter', async () => {
    const anSLO = createSLO({
      indicator: createMetricCustomIndicator({
        total: {
          metrics: [{ name: 'A', aggregation: 'doc_count', filter: 'outcome: *' }],
          equation: 'A / 100',
        },
      }),
    });
    const transform = await generator.getTransformParams(anSLO);

    expect(transform.pivot!.aggregations!['slo.denominator']).toMatchSnapshot();
  });

  it("overrides the range filter when 'preventInitialBackfill' is true", async () => {
    const slo = createSLO({
      indicator: createMetricCustomIndicator(),
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
        log_timestamp: {
          gte: 'now-300s/m', // 2m + 2m + 60s
        },
      },
    });
  });
});
