/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchSearchRequestBody } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  occurrencesBudgetingMethodSchema,
  rollingTimeWindowSchema,
  timeslicesBudgetingMethodSchema,
  toMomentUnitOfTime,
} from '@kbn/slo-schema';
import type { GetSLOTimeseriesResponse } from '@kbn/slo-schema';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import type { DateRange, GroupBy, Objective, SLODefinition, TimeWindow } from '../domain/models';
import { toCalendarAlignedTimeWindowMomentUnit } from '../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../domain/services';
import { getSlicesFromDateRange } from './utils/get_slices_from_date_range';

interface TimeseriesDataPoint {
  date: string;
  sliValue: number;
  status: string;
  errorBudget: {
    initial: number;
    consumed: number;
    remaining: number;
    isEstimated: boolean;
  };
  numerator?: number;
  denominator?: number;
}

interface TimeseriesAggBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  good: { value: number };
  total: { value: number };
  cumulative_good?: { value: number };
  cumulative_total?: { value: number };
}

interface FetchTimeseriesParams {
  slo: SLODefinition;
  instanceId: string;
  from: Date;
  to: Date;
  remoteName?: string;
  bucketInterval?: string;
  includeRaw: boolean;
}

export class SloTimeseriesClient {
  constructor(private esClient: ElasticsearchClient) {}

  async fetch(params: FetchTimeseriesParams): Promise<GetSLOTimeseriesResponse> {
    const { slo, instanceId, from, to, remoteName, bucketInterval, includeRaw } = params;
    const { timeWindow, budgetingMethod, objective, groupBy } = slo;

    const dateRange = this.getDateRange(timeWindow, { from, to });
    const fixedInterval = bucketInterval ?? this.getAutoFixedInterval(from, to);

    const searchBody = this.generateSearchQuery({
      sloId: slo.id,
      revision: slo.revision,
      instanceId,
      groupBy,
      timeWindow,
      budgetingMethod,
      dateRange,
      fixedInterval,
    });

    const index = remoteName
      ? `${remoteName}:${SLI_DESTINATION_INDEX_PATTERN}`
      : SLI_DESTINATION_INDEX_PATTERN;

    const result = await this.esClient.search({ index, ...searchBody });

    const buckets =
      (result.aggregations?.daily as { buckets: TimeseriesAggBucket[] })?.buckets ?? [];

    const dataPoints = this.computeDataPoints({
      buckets,
      timeWindow,
      budgetingMethod,
      objective,
      dateRange,
      includeRaw,
    });

    return {
      sloId: slo.id,
      instanceId: instanceId || ALL_VALUE,
      dataPoints,
    };
  }

  private computeDataPoints({
    buckets,
    timeWindow,
    budgetingMethod,
    objective,
    dateRange,
    includeRaw,
  }: {
    buckets: TimeseriesAggBucket[];
    timeWindow: TimeWindow;
    budgetingMethod: string;
    objective: Objective;
    dateRange: { range: DateRange; queryRange: DateRange };
    includeRaw: boolean;
  }): TimeseriesDataPoint[] {
    const initialErrorBudget = 1 - objective.target;
    const isTimeslices = timeslicesBudgetingMethodSchema.is(budgetingMethod);
    const isRolling = rollingTimeWindowSchema.is(timeWindow);

    return buckets
      .filter((bucket) => {
        if (isRolling) {
          return (
            moment(bucket.key_as_string).isSameOrAfter(dateRange.range.from) &&
            moment(bucket.key_as_string).isSameOrBefore(dateRange.range.to)
          );
        }
        return true;
      })
      .map((bucket) => {
        const good = bucket.cumulative_good?.value ?? 0;
        const total = bucket.cumulative_total?.value ?? 0;

        let sliValue: number;
        if (isTimeslices) {
          let totalSlices: number;
          if (isRolling) {
            totalSlices = Math.ceil(
              timeWindow.duration.asSeconds() / objective.timesliceWindow!.asSeconds()
            );
          } else {
            totalSlices = getSlicesFromDateRange(dateRange.range, objective.timesliceWindow!);
          }
          sliValue = computeSLI(good, total, totalSlices);
        } else {
          sliValue = computeSLI(good, total);
        }

        const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;
        const errorBudget = toErrorBudget(
          initialErrorBudget,
          consumedErrorBudget,
          calendarAlignedTimeWindowSchema.is(timeWindow) &&
            occurrencesBudgetingMethodSchema.is(budgetingMethod)
        );

        const dataPoint: TimeseriesDataPoint = {
          date: bucket.key_as_string,
          sliValue,
          status: computeSummaryStatus(objective, sliValue, errorBudget),
          errorBudget,
        };

        if (includeRaw) {
          dataPoint.numerator = bucket.good.value;
          dataPoint.denominator = bucket.total.value;
        }

        return dataPoint;
      });
  }

  private generateSearchQuery({
    sloId,
    revision,
    instanceId,
    groupBy,
    timeWindow,
    budgetingMethod,
    dateRange,
    fixedInterval,
  }: {
    sloId: string;
    revision: number;
    instanceId: string;
    groupBy: GroupBy;
    timeWindow: TimeWindow;
    budgetingMethod: string;
    dateRange: { range: DateRange; queryRange: DateRange };
    fixedInterval: string;
  }): { body: SearchSearchRequestBody } {
    const unit = toMomentUnitOfTime(timeWindow.duration.unit);
    const timeWindowDurationInDays = moment.duration(timeWindow.duration.value, unit).asDays();
    const bucketsPerDay = this.getBucketsPerDay(fixedInterval);

    const extraFilterByInstanceId =
      !!groupBy && ![groupBy].flat().includes(ALL_VALUE) && instanceId !== ALL_VALUE
        ? [{ term: { 'slo.instanceId': instanceId } }]
        : [];

    return {
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { 'slo.id': sloId } },
              { term: { 'slo.revision': revision } },
              {
                range: {
                  '@timestamp': {
                    gte: dateRange.queryRange.from.toISOString(),
                    lte: dateRange.queryRange.to.toISOString(),
                  },
                },
              },
              ...extraFilterByInstanceId,
            ],
          },
        },
        aggs: {
          daily: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: fixedInterval,
              extended_bounds: {
                min: dateRange.queryRange.from.toISOString(),
                max: dateRange.queryRange.to.toISOString(),
              },
            },
            aggs: {
              ...(occurrencesBudgetingMethodSchema.is(budgetingMethod) && {
                good: { sum: { field: 'slo.numerator' } },
                total: { sum: { field: 'slo.denominator' } },
              }),
              ...(timeslicesBudgetingMethodSchema.is(budgetingMethod) && {
                good: { sum: { field: 'slo.isGoodSlice' } },
                total: { value_count: { field: 'slo.isGoodSlice' } },
              }),
              cumulative_good: {
                moving_fn: {
                  buckets_path: 'good',
                  window: Math.ceil(timeWindowDurationInDays * bucketsPerDay),
                  shift: 1,
                  script: 'MovingFunctions.sum(values)',
                  gap_policy: 'insert_zeros',
                },
              },
              cumulative_total: {
                moving_fn: {
                  buckets_path: 'total',
                  window: Math.ceil(timeWindowDurationInDays * bucketsPerDay),
                  shift: 1,
                  script: 'MovingFunctions.sum(values)',
                  gap_policy: 'insert_zeros',
                },
              },
            },
          },
        },
      },
    };
  }

  private getDateRange(
    timeWindow: TimeWindow,
    range: DateRange
  ): { range: DateRange; queryRange: DateRange } {
    if (rollingTimeWindowSchema.is(timeWindow)) {
      const unit = toMomentUnitOfTime(timeWindow.duration.unit);
      return {
        range,
        queryRange: {
          from: moment(range.from)
            .subtract(timeWindow.duration.value, unit)
            .startOf('minute')
            .toDate(),
          to: moment(range.to).startOf('minute').toDate(),
        },
      };
    }

    if (calendarAlignedTimeWindowSchema.is(timeWindow)) {
      const unit = toCalendarAlignedTimeWindowMomentUnit(timeWindow);
      const from = moment.utc(range.from).startOf(unit);
      const to = moment.utc(range.to).endOf(unit);
      const calendarRange = { from: from.toDate(), to: to.toDate() };
      return { range: calendarRange, queryRange: calendarRange };
    }

    assertNever(timeWindow);
  }

  private getAutoFixedInterval(from: Date, to: Date): string {
    const durationInDays = Math.ceil(moment(to).diff(from, 'days'));
    if (durationInDays <= 3) return '30m';
    if (durationInDays <= 7) return '1h';
    if (durationInDays <= 30) return '4h';
    if (durationInDays <= 90) return '12h';
    return '1d';
  }

  private getBucketsPerDay(fixedInterval: string): number {
    const match = fixedInterval.match(/^(\d+)(m|h|d)$/);
    if (!match) return 1;
    const [, valueStr, unit] = match;
    const value = parseInt(valueStr, 10);
    switch (unit) {
      case 'm':
        return (24 * 60) / value;
      case 'h':
        return 24 / value;
      case 'd':
        return 1 / value;
      default:
        return 1;
    }
  }
}
