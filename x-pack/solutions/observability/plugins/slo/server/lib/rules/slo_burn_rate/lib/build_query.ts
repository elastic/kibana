/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { SLODefinition } from '../../../../domain/models';
import { Duration, toDurationUnit } from '../../../../domain/models';
import { getDelayInSecondsFromSLO } from '../../../../domain/services/get_delay_in_seconds_from_slo';
import { getLookbackDateRange } from '../../../../domain/services/get_lookback_date_range';
import { getSlicesFromDateRange } from '../../../../services/utils/get_slices_from_date_range';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../../../../common/constants';
import type { BurnRateRuleParams } from '../types';

export const EVALUATION_COLUMNS = {
  instanceId: 'instance_id',
  windowIndex: 'window_index',
  shortWindowBurnRate: 'short_window_burn_rate',
  longWindowBurnRate: 'long_window_burn_rate',
} as const;

export interface EvaluationQuery {
  query: string;
  params: estypes.EsqlNamedValue[];
  filter: estypes.QueryDslQueryContainer;
}

type WindowType = 'short' | 'long';

interface DateRange {
  from: Date;
  to: Date;
}

const getWindowDateRanges = (
  startedAt: Date,
  params: BurnRateRuleParams,
  delayInSeconds: number
): Array<Record<WindowType, DateRange>> =>
  params.windows.map((winDef) => ({
    short: getLookbackDateRange(
      startedAt,
      new Duration(winDef.shortWindow.value, toDurationUnit(winDef.shortWindow.unit)),
      delayInSeconds
    ),
    long: getLookbackDateRange(
      startedAt,
      new Duration(winDef.longWindow.value, toDurationUnit(winDef.longWindow.unit)),
      delayInSeconds
    ),
  }));

/**
 * Returns the Query DSL filter matching the SLI documents of the SLO revision over the longest window.
 */
export function buildEvaluationFilter(
  startedAt: Date,
  slo: SLODefinition,
  params: BurnRateRuleParams
): estypes.QueryDslQueryContainer {
  const dateRanges = getWindowDateRanges(startedAt, params, getDelayInSecondsFromSLO(slo));
  const from = Math.min(
    ...dateRanges.flatMap(({ short, long }) => [short.from.getTime(), long.from.getTime()])
  );
  const to = Math.max(
    ...dateRanges.flatMap(({ short, long }) => [short.to.getTime(), long.to.getTime()])
  );

  return {
    bool: {
      filter: [
        { term: { 'slo.id': slo.id } },
        { term: { 'slo.revision': slo.revision } },
        { exists: { field: 'slo.instanceId' } },
        {
          range: {
            '@timestamp': {
              gte: new Date(from).toISOString(),
              lt: new Date(to).toISOString(),
            },
          },
        },
      ],
    },
  };
}

/**
 * Returns an ES|QL request computing every window burn rate per instance, and keeping only the
 * instances breaching at least one window, sorted by window priority then burn rate.
 */
export function buildEvaluationQuery(
  startedAt: Date,
  slo: SLODefinition,
  params: BurnRateRuleParams,
  limit: number
): EvaluationQuery {
  const isTimeslices = slo.budgetingMethod === 'timeslices';
  const dateRanges = getWindowDateRanges(startedAt, params, getDelayInSecondsFromSLO(slo));
  const queryParams: estypes.EsqlNamedValue[] = [{ target: slo.objective.target }];
  const stats: string[] = [];
  const burnRates: string[] = [];
  const breachConditions: string[] = [];

  dateRanges.forEach((ranges, index) => {
    const windowTypes: WindowType[] = ['short', 'long'];
    windowTypes.forEach((type) => {
      const id = `w${index}_${type}`;
      const dateRange = ranges[type];
      queryParams.push({ [`${id}_from`]: dateRange.from.toISOString() });
      queryParams.push({ [`${id}_to`]: dateRange.to.toISOString() });
      const inRange = `@timestamp >= ?${id}_from AND @timestamp < ?${id}_to`;

      if (isTimeslices) {
        stats.push(`${id}_good = SUM(slo.isGoodSlice) WHERE ${inRange}`);
        stats.push(`${id}_total = COUNT(slo.isGoodSlice) WHERE ${inRange}`);
        const totalSlices = getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);
        if (totalSlices > 0) {
          queryParams.push({ [`${id}_slices`]: totalSlices });
          burnRates.push(
            `${id}_burn_rate = CASE(${id}_total > 0, (TO_DOUBLE(${id}_total - ${id}_good) / ?${id}_slices) / (1 - ?target), 0.0)`
          );
        } else {
          burnRates.push(`${id}_burn_rate = 0.0`);
        }
      } else {
        stats.push(`${id}_good = SUM(slo.numerator) WHERE ${inRange}`);
        stats.push(`${id}_total = SUM(slo.denominator) WHERE ${inRange}`);
        burnRates.push(
          `${id}_burn_rate = CASE(${id}_total > 0, (1 - TO_DOUBLE(${id}_good) / ${id}_total) / (1 - ?target), 0.0)`
        );
      }
    });

    queryParams.push({ [`w${index}_threshold`]: params.windows[index].burnRateThreshold });
    breachConditions.push(
      `w${index}_short_burn_rate >= ?w${index}_threshold AND w${index}_long_burn_rate >= ?w${index}_threshold, ${index}`
    );
  });

  const { instanceId, windowIndex, shortWindowBurnRate, longWindowBurnRate } = EVALUATION_COLUMNS;
  const selectByWindow = (type: WindowType) =>
    `CASE(${dateRanges
      .map((_, index) => `${windowIndex} == ${index}, w${index}_${type}_burn_rate`)
      .join(', ')})`;

  const query = [
    `FROM ${SLI_DESTINATION_INDEX_PATTERN}`,
    `STATS ${stats.join(', ')} BY ${instanceId} = slo.instanceId`,
    `EVAL ${burnRates.join(', ')}`,
    `EVAL ${windowIndex} = CASE(${breachConditions.join(', ')})`,
    `WHERE ${windowIndex} IS NOT NULL`,
    `EVAL ${shortWindowBurnRate} = ${selectByWindow(
      'short'
    )}, ${longWindowBurnRate} = ${selectByWindow('long')}`,
    `EVAL evaluation_value = LEAST(${shortWindowBurnRate}, ${longWindowBurnRate})`,
    `SORT ${windowIndex} ASC, evaluation_value DESC, ${instanceId} ASC`,
    `KEEP ${instanceId}, ${windowIndex}, ${shortWindowBurnRate}, ${longWindowBurnRate}`,
    `LIMIT ${limit}`,
  ].join('\n| ');

  return {
    query,
    params: queryParams,
    filter: buildEvaluationFilter(startedAt, slo, params),
  };
}
