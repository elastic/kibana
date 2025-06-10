/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import { Duration, SLODefinition, toDurationUnit } from '../../../../domain/models';
import { getDelayInSecondsFromSLO } from '../../../../domain/services/get_delay_in_seconds_from_slo';
import { getLookbackDateRange } from '../../../../domain/services/get_lookback_date_range';
import { getSlicesFromDateRange } from '../../../../services/utils/get_slices_from_date_range';
import { BurnRateRuleParams, WindowSchema } from '../types';

type BurnRateWindowWithDuration = WindowSchema & {
  longDuration: Duration;
  shortDuration: Duration;
};

export interface EvaluationAfterKey extends AggregationsCompositeAggregateKey {
  instanceId: string;
}

export const LONG_WINDOW = 'LONG';
export const SHORT_WINDOW = 'SHORT';
const BURN_RATE = 'BURN_RATE';
const WINDOW = 'WINDOW';
const ABOVE_THRESHOLD = 'ABOVE_THRESHOLD';
type WindowType = typeof LONG_WINDOW | typeof SHORT_WINDOW;

export function generateWindowId(index: string | number) {
  return `${WINDOW}_${index}`;
}

export function generateStatsKey(id: string, type: WindowType) {
  return `${id}_${type}`;
}

export function generateBurnRateKey(id: string, type: WindowType) {
  return `${generateStatsKey(id, type)}_${BURN_RATE}`;
}

export function generateAboveThresholdKey(id: string, type: WindowType) {
  return `${generateStatsKey(id, type)}_${ABOVE_THRESHOLD}`;
}

const TIMESLICE_AGGS = {
  good: { sum: { field: 'slo.isGoodSlice' } },
  total: { value_count: { field: 'slo.isGoodSlice' } },
};

const OCCURRENCE_AGGS = {
  good: { sum: { field: 'slo.numerator' } },
  total: { sum: { field: 'slo.denominator' } },
};

function buildWindowAgg(
  id: string,
  type: WindowType,
  threshold: number,
  slo: SLODefinition,
  dateRange: { from: Date; to: Date }
) {
  const isTimesliceBudgetingMethod = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod);

  const aggs = isTimesliceBudgetingMethod ? TIMESLICE_AGGS : OCCURRENCE_AGGS;

  // For timeslice budgeting method, we always compute the burn rate based on the observed bad slices, e.g. total observed  - good observed = bad slices observed,
  // And we compare this to the expected slices in the whole window duration
  const burnRateAgg = isTimesliceBudgetingMethod
    ? {
        bucket_script: {
          buckets_path: {
            good: `${generateStatsKey(id, type)}>good`,
            total: `${generateStatsKey(id, type)}>total`,
          },
          script: {
            source:
              'params.total != null && params.total > 0 && params.totalSlices > 0 ? ((params.total - params.good) / params.totalSlices) / (1 - params.target) : 0',
            params: {
              target: slo.objective.target,
              totalSlices: getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!),
            },
          },
        },
      }
    : {
        bucket_script: {
          buckets_path: {
            good: `${generateStatsKey(id, type)}>good`,
            total: `${generateStatsKey(id, type)}>total`,
          },
          script: {
            source:
              'params.total != null && params.total > 0 ? (1 - (params.good / params.total)) / (1 - params.target) : 0',
            params: { target: slo.objective.target },
          },
        },
      };

  return {
    [generateStatsKey(id, type)]: {
      filter: {
        range: {
          '@timestamp': {
            gte: dateRange.from.toISOString(),
            lt: dateRange.to.toISOString(),
          },
        },
      },
      aggs,
    },
    [generateBurnRateKey(id, type)]: burnRateAgg,
    [generateAboveThresholdKey(id, type)]: {
      bucket_script: {
        buckets_path: { burnRate: generateBurnRateKey(id, type) },
        script: {
          source: 'params.burnRate >= params.threshold ? 1 : 0',
          params: { threshold },
        },
      },
    },
  };
}

function buildWindowAggs(
  startedAt: Date,
  slo: SLODefinition,
  burnRateWindows: BurnRateWindowWithDuration[],
  delayInSeconds = 0
) {
  return burnRateWindows.reduce((acc, winDef, index) => {
    const shortDateRange = getLookbackDateRange(startedAt, winDef.shortDuration, delayInSeconds);
    const longDateRange = getLookbackDateRange(startedAt, winDef.longDuration, delayInSeconds);
    const windowId = generateWindowId(index);
    return {
      ...acc,
      ...buildWindowAgg(windowId, SHORT_WINDOW, winDef.burnRateThreshold, slo, shortDateRange),
      ...buildWindowAgg(windowId, LONG_WINDOW, winDef.burnRateThreshold, slo, longDateRange),
    };
  }, {});
}

function buildEvaluation(burnRateWindows: BurnRateWindowWithDuration[]) {
  const bucketsPath = burnRateWindows.reduce((acc, _winDef, index) => {
    const windowId = `${WINDOW}_${index}`;
    return {
      ...acc,
      [generateAboveThresholdKey(windowId, SHORT_WINDOW)]: generateAboveThresholdKey(
        windowId,
        SHORT_WINDOW
      ),
      [generateAboveThresholdKey(windowId, LONG_WINDOW)]: generateAboveThresholdKey(
        windowId,
        LONG_WINDOW
      ),
    };
  }, {});

  const source = burnRateWindows
    .map((_windDef, index) => {
      const windowId = `${WINDOW}_${index}`;
      return `(params.${generateAboveThresholdKey(
        windowId,
        SHORT_WINDOW
      )} == 1 && params.${generateAboveThresholdKey(windowId, LONG_WINDOW)} == 1)`;
    })
    .join(' || ');

  return {
    evaluation: {
      bucket_selector: {
        buckets_path: bucketsPath,
        script: {
          source,
        },
      },
    },
  };
}

function buildGroupingAgg() {
  return {
    groupings: {
      top_hits: {
        size: 1,
        _source: ['slo.groupings'],
      },
    },
  };
}

export function buildQuery(
  startedAt: Date,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  afterKey?: EvaluationAfterKey
) {
  const delayInSeconds = getDelayInSecondsFromSLO(slo);
  const burnRateWindows = params.windows.map((winDef) => {
    return {
      ...winDef,
      longDuration: new Duration(winDef.longWindow.value, toDurationUnit(winDef.longWindow.unit)),
      shortDuration: new Duration(
        winDef.shortWindow.value,
        toDurationUnit(winDef.shortWindow.unit)
      ),
    };
  });

  const longestLookbackWindow = burnRateWindows.reduce((acc, winDef) => {
    return winDef.longDuration.isShorterThan(acc.longDuration) ? acc : winDef;
  }, burnRateWindows[0]);
  const longestDateRange = getLookbackDateRange(
    startedAt,
    longestLookbackWindow.longDuration,
    delayInSeconds
  );

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'slo.id': slo.id } },
          { term: { 'slo.revision': slo.revision } },
          {
            range: {
              '@timestamp': {
                gte: longestDateRange.from.toISOString(),
                lt: longestDateRange.to.toISOString(),
              },
            },
          },
        ],
      },
    },
    aggs: {
      instances: {
        composite: {
          ...(afterKey ? { after: afterKey } : {}),
          size: 1000,
          sources: [{ instanceId: { terms: { field: 'slo.instanceId' } } }],
        },
        aggs: {
          ...buildWindowAggs(startedAt, slo, burnRateWindows, delayInSeconds),
          ...buildEvaluation(burnRateWindows),
          ...buildGroupingAgg(),
        },
      },
    },
  };
}
