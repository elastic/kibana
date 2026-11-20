/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetric, DynamicMetricAgg } from '@kbn/entity-store/common';
import type { QueryEngine } from '../../../../common';
import {
  buildMetricPresenceWherePredicate,
  buildMetricScaleOffsetEval,
  buildMetricStatsAgg,
  combineSourceFilterWithMetricFilter,
  groupSourceMetricsByFilterForPlans,
} from './metrics';

const metric = (
  name: string,
  field: string,
  agg: DynamicMetricAgg,
  extras: Partial<DynamicMetric> = {}
): DynamicMetric => ({ name, field, agg, ...extras });

const ALL_AGGS: DynamicMetricAgg[] = [
  'last',
  'avg',
  'min',
  'max',
  'sum',
  'count',
  'count_distinct',
  'sum_rate',
  'max_rate',
  'avg_rate',
  'min_rate',
];

const RATE_AGGS: DynamicMetricAgg[] = ['sum_rate', 'max_rate', 'avg_rate', 'min_rate'];

describe('buildMetricStatsAgg', () => {
  const expectedByEngine: Record<
    DynamicMetricAgg,
    Record<QueryEngine, string | undefined>
  > = {
    last: {
      TS: '`m` = LAST(`f`, `@timestamp`) WHERE `f` IS NOT NULL',
      FROM: '`m` = LAST(`f`, `@timestamp`) WHERE `f` IS NOT NULL',
    },
    avg: {
      TS: '`m` = AVG(AVG_OVER_TIME(`f`))',
      FROM: '`m` = AVG(`f`)',
    },
    min: {
      TS: '`m` = MIN(MIN_OVER_TIME(`f`))',
      FROM: '`m` = MIN(`f`)',
    },
    max: {
      TS: '`m` = MAX(MAX_OVER_TIME(`f`))',
      FROM: '`m` = MAX(`f`)',
    },
    sum: {
      TS: '`m` = SUM(SUM_OVER_TIME(`f`))',
      FROM: '`m` = SUM(`f`)',
    },
    count: {
      TS: '`m` = SUM(COUNT_OVER_TIME(`f`))',
      FROM: '`m` = COUNT(`f`)',
    },
    count_distinct: {
      TS: '`m` = COUNT_DISTINCT(`f`)',
      FROM: '`m` = COUNT_DISTINCT(`f`)',
    },
    sum_rate: {
      TS: '`m` = SUM(RATE(`f`))',
      FROM: undefined,
    },
    max_rate: {
      TS: '`m` = MAX(RATE(`f`))',
      FROM: undefined,
    },
    avg_rate: {
      TS: '`m` = AVG(RATE(`f`))',
      FROM: undefined,
    },
    min_rate: {
      TS: '`m` = MIN(RATE(`f`))',
      FROM: undefined,
    },
  };

  it.each(
    ALL_AGGS.flatMap((agg) =>
      (['TS', 'FROM'] as const).map((engine) => [agg, engine, expectedByEngine[agg][engine]] as const)
    )
  )('%s under %s', (agg, engine, expected) => {
    expect(buildMetricStatsAgg('m', 'f', agg, engine)).toBe(expected);
  });
});

describe('buildMetricPresenceWherePredicate', () => {
  it('is undefined when there are no metrics', () => {
    expect(buildMetricPresenceWherePredicate([])).toBeUndefined();
  });

  it('uses the single value-metric field', () => {
    expect(buildMetricPresenceWherePredicate([metric('cpu', 'system.cpu.pct', 'last')])).toBe(
      '`system.cpu.pct` IS NOT NULL'
    );
  });

  it('ORs distinct value-metric fields (rates count as value metrics)', () => {
    expect(
      buildMetricPresenceWherePredicate([
        metric('cpu', 'system.cpu.pct', 'last'),
        metric('bytes', 'host.network.bytes', 'sum_rate'),
        metric('cpu_again', 'system.cpu.pct', 'avg'),
      ])
    ).toBe('(`system.cpu.pct` IS NOT NULL OR `host.network.bytes` IS NOT NULL)');
  });

  it('falls back to count fields when the plan is counts-only', () => {
    expect(
      buildMetricPresenceWherePredicate([
        metric('restarts', 'system.restarts', 'count'),
        metric('pods', 'kubernetes.pod.name', 'count_distinct'),
      ])
    ).toBe('(`system.restarts` IS NOT NULL OR `kubernetes.pod.name` IS NOT NULL)');
  });

  it('ignores count fields when any value metric is present', () => {
    expect(
      buildMetricPresenceWherePredicate([
        metric('cpu', 'system.cpu.pct', 'last'),
        metric('restarts', 'system.restarts', 'count'),
      ])
    ).toBe('`system.cpu.pct` IS NOT NULL');
  });
});

describe('buildMetricScaleOffsetEval', () => {
  it('is undefined when neither scale nor offset is set', () => {
    expect(buildMetricScaleOffsetEval('m', undefined, undefined)).toBeUndefined();
  });

  it('emits scale only, offset only, or both', () => {
    expect(buildMetricScaleOffsetEval('m', 8, undefined)).toBe('`m` = `m` * 8');
    expect(buildMetricScaleOffsetEval('m', undefined, 1)).toBe('`m` = `m` + 1');
    expect(buildMetricScaleOffsetEval('m', -1, 1)).toBe('`m` = `m` * -1 + 1');
  });
});

describe('groupSourceMetricsByFilterForPlans', () => {
  it('yields one empty unfiltered group when there are no metrics', () => {
    expect(groupSourceMetricsByFilterForPlans([], 'metrics-*')).toEqual([
      { canonicalMetricFilter: '', metrics: [] },
    ]);
  });

  it('puts the unfiltered group first, then filtered groups in appearance order', () => {
    const groups = groupSourceMetricsByFilterForPlans(
      [
        metric('filtered_a', 'a', 'last', { filter: 'state == "idle"' }),
        metric('unfiltered', 'u', 'last'),
        metric('filtered_b', 'b', 'last', { filter: 'state == "user"' }),
      ],
      'metrics-*'
    );
    expect(groups.map(({ canonicalMetricFilter, metrics }) => ({
      canonicalMetricFilter,
      names: metrics.map(({ name }) => name),
    }))).toEqual([
      { canonicalMetricFilter: '', names: ['unfiltered'] },
      { canonicalMetricFilter: 'state == "idle"', names: ['filtered_a'] },
      { canonicalMetricFilter: 'state == "user"', names: ['filtered_b'] },
    ]);
  });

  it('has no unfiltered group when every metric is filtered', () => {
    const groups = groupSourceMetricsByFilterForPlans(
      [metric('a', 'a', 'last', { filter: 'x == 1' }), metric('b', 'b', 'last', { filter: 'y == 2' })],
      'metrics-*'
    );
    expect(groups.map(({ canonicalMetricFilter }) => canonicalMetricFilter)).toEqual([
      'x == 1',
      'y == 2',
    ]);
  });
});

describe('combineSourceFilterWithMetricFilter', () => {
  it('returns undefined when neither side has a filter', () => {
    expect(combineSourceFilterWithMetricFilter(undefined, '')).toBeUndefined();
  });

  it('returns the non-empty side alone', () => {
    expect(combineSourceFilterWithMetricFilter('src == 1', '')).toBe('src == 1');
    expect(combineSourceFilterWithMetricFilter(undefined, 'm == 1')).toBe('m == 1');
  });

  it('ANDs both sides when both are set', () => {
    expect(combineSourceFilterWithMetricFilter('src == 1', 'm == 1')).toBe(
      '(src == 1) AND (m == 1)'
    );
  });
});

describe('rate aggs are TS-only at STATS', () => {
  it.each(RATE_AGGS)('%s is defined under TS and omitted under FROM', (agg) => {
    expect(buildMetricStatsAgg('m', 'f', agg, 'TS')).toContain('RATE(`f`)');
    expect(buildMetricStatsAgg('m', 'f', agg, 'FROM')).toBeUndefined();
  });
});
