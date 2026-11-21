/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { Builder, esql, synth } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
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

  const queryParams: estypes.EsqlNamedValue[] = [];
  const param = (name: string, value: string | number) => {
    queryParams.push({ [name]: value });
    return synth.par(name);
  };
  const filteredAgg = (agg: ESQLAstExpression, condition: ESQLAstExpression) =>
    Builder.expression.func.binary('where', [agg, condition]);

  const target = param('target', slo.objective.target);
  const stats: ESQLAstExpression[] = [];
  const burnRates: ESQLAstExpression[] = [];
  const breachConditions: ESQLAstExpression[] = [];

  dateRanges.forEach((ranges, index) => {
    const windowTypes: WindowType[] = ['short', 'long'];
    windowTypes.forEach((type) => {
      const id = `w${index}_${type}`;
      const dateRange = ranges[type];
      const inRange = esql.exp`@timestamp >= ${param(
        `${id}_from`,
        dateRange.from.toISOString()
      )} AND @timestamp < ${param(`${id}_to`, dateRange.to.toISOString())}`;
      const good = esql.col(`${id}_good`);
      const total = esql.col(`${id}_total`);
      const burnRate = esql.col(`${id}_burn_rate`);

      if (isTimeslices) {
        stats.push(filteredAgg(esql.exp`${good} = SUM(slo.isGoodSlice)`, inRange));
        stats.push(filteredAgg(esql.exp`${total} = COUNT(slo.isGoodSlice)`, inRange));
        const totalSlices = getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);
        burnRates.push(
          totalSlices > 0
            ? esql.exp`${burnRate} = CASE(${total} > 0, (TO_DOUBLE(${total} - ${good}) / ${param(
                `${id}_slices`,
                totalSlices
              )}) / (1 - ${target}), 0.0)`
            : esql.exp`${burnRate} = 0.0`
        );
      } else {
        stats.push(filteredAgg(esql.exp`${good} = SUM(slo.numerator)`, inRange));
        stats.push(filteredAgg(esql.exp`${total} = SUM(slo.denominator)`, inRange));
        burnRates.push(
          esql.exp`${burnRate} = CASE(${total} > 0, (1 - TO_DOUBLE(${good}) / ${total}) / (1 - ${target}), 0.0)`
        );
      }
    });

    const threshold = param(`w${index}_threshold`, params.windows[index].burnRateThreshold);
    breachConditions.push(
      esql.exp`${esql.col(`w${index}_short_burn_rate`)} >= ${threshold} AND ${esql.col(
        `w${index}_long_burn_rate`
      )} >= ${threshold}`,
      esql.int(index)
    );
  });

  const { instanceId, windowIndex, shortWindowBurnRate, longWindowBurnRate } = EVALUATION_COLUMNS;
  const selectByWindow = (type: WindowType) =>
    dateRanges.flatMap((_, index) => [
      esql.exp`${esql.col(windowIndex)} == ${esql.int(index)}`,
      esql.col(`w${index}_${type}_burn_rate`),
    ]);

  const query = esql.from(SLI_DESTINATION_INDEX_PATTERN).pipe`STATS ${stats} BY ${esql.col(
    instanceId
  )} = slo.instanceId`.pipe`EVAL ${burnRates}`.pipe`EVAL ${esql.col(
    windowIndex
  )} = CASE(${breachConditions})`.where`${esql.col(windowIndex)} IS NOT NULL`.pipe`EVAL ${esql.col(
    shortWindowBurnRate
  )} = CASE(${selectByWindow('short')}), ${esql.col(longWindowBurnRate)} = CASE(${selectByWindow(
    'long'
  )})`.pipe`EVAL evaluation_value = LEAST(${esql.col(shortWindowBurnRate)}, ${esql.col(
    longWindowBurnRate
  )})`
    .sort([windowIndex, 'ASC'], ['evaluation_value', 'DESC'], [instanceId, 'ASC'])
    .keep(instanceId, windowIndex, shortWindowBurnRate, longWindowBurnRate)
    .limit(limit);

  return {
    query: query.print('pipe-multiline'),
    params: queryParams,
    filter: buildEvaluationFilter(startedAt, slo, params),
  };
}
