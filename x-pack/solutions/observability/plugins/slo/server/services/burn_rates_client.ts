/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsAggregationContainer,
  AggregationsDateRangeAggregate,
  AggregationsSumAggregate,
  AggregationsValueCountAggregate,
  MsearchMultisearchBody,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { DateRange, Duration, SLODefinition } from '../domain/models';
import { computeBurnRate, computeSLI } from '../domain/services';
import { getDelayInSecondsFromSLO } from '../domain/services/get_delay_in_seconds_from_slo';
import { getLookbackDateRange } from '../domain/services/get_lookback_date_range';
import { InternalQueryError } from '../errors';
import { getSlicesFromDateRange } from './utils/get_slices_from_date_range';

type WindowName = string;
export interface BurnRatesClient {
  calculate(
    slo: SLODefinition,
    instanceId: string,
    lookbackWindows: LookbackWindow[],
    remoteName?: string
  ): Promise<Array<{ burnRate: number; sli: number; name: WindowName }>>;
}

interface LookbackWindow {
  name: WindowName;
  duration: Duration;
}

type EsAggregations = Record<WindowName, AggregationsDateRangeAggregate>;

export class DefaultBurnRatesClient implements BurnRatesClient {
  constructor(private esClient: ElasticsearchClient) {}

  async calculate(
    slo: SLODefinition,
    instanceId: string,
    lookbackWindows: LookbackWindow[],
    remoteName?: string
  ): Promise<Array<{ burnRate: number; sli: number; name: WindowName }>> {
    const sortedLookbackWindows = [...lookbackWindows].sort((a, b) =>
      a.duration.isShorterThan(b.duration) ? 1 : -1
    );
    const longestLookbackWindow = sortedLookbackWindows[0];
    const delayInSeconds = getDelayInSecondsFromSLO(slo);
    const longestDateRange = getLookbackDateRange(
      new Date(),
      longestLookbackWindow.duration,
      delayInSeconds
    );

    const index = remoteName
      ? `${remoteName}:${SLI_DESTINATION_INDEX_PATTERN}`
      : SLI_DESTINATION_INDEX_PATTERN;

    const result = await this.esClient.search<unknown, EsAggregations>({
      ...commonQuery(slo, instanceId, longestDateRange),
      index,
      aggs: occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)
        ? toLookbackWindowsAggregationsQuery(
            longestDateRange.to,
            sortedLookbackWindows,
            delayInSeconds
          )
        : toLookbackWindowsSlicedAggregationsQuery(
            longestDateRange.to,
            sortedLookbackWindows,
            delayInSeconds
          ),
    });

    return handleWindowedResult(result.aggregations, lookbackWindows, slo);
  }
}

function commonQuery(
  slo: SLODefinition,
  instanceId: string,
  dateRange: DateRange
): Pick<MsearchMultisearchBody, 'size' | 'query'> {
  const filter: QueryDslQueryContainer[] = [
    { term: { 'slo.id': slo.id } },
    { term: { 'slo.revision': slo.revision } },
    {
      range: {
        '@timestamp': { gte: dateRange.from.toISOString(), lt: dateRange.to.toISOString() },
      },
    },
  ];

  if (instanceId !== ALL_VALUE) {
    filter.push({ term: { 'slo.instanceId': instanceId } });
  }

  return {
    size: 0,
    query: {
      bool: {
        filter,
      },
    },
  };
}

function toLookbackWindowsAggregationsQuery(
  startedAt: Date,
  sortedLookbackWindow: LookbackWindow[],
  delayInSeconds = 0
) {
  return sortedLookbackWindow.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, lookbackWindow) => {
      const lookbackDateRange = getLookbackDateRange(
        startedAt,
        lookbackWindow.duration,
        delayInSeconds
      );

      return {
        ...acc,
        [lookbackWindow.name]: {
          date_range: {
            field: '@timestamp',
            ranges: [
              {
                from: lookbackDateRange.from.toISOString(),
                to: lookbackDateRange.to.toISOString(),
              },
            ],
          },
          aggs: {
            good: { sum: { field: 'slo.numerator' } },
            total: { sum: { field: 'slo.denominator' } },
          },
        },
      };
    },
    {}
  );
}

function toLookbackWindowsSlicedAggregationsQuery(
  startedAt: Date,
  lookbackWindows: LookbackWindow[],
  delayInSeconds = 0
) {
  return lookbackWindows.reduce<Record<string, AggregationsAggregationContainer>>(
    (acc, lookbackWindow) => {
      const lookbackDateRange = getLookbackDateRange(
        startedAt,
        lookbackWindow.duration,
        delayInSeconds
      );

      return {
        ...acc,
        [lookbackWindow.name]: {
          date_range: {
            field: '@timestamp',
            ranges: [
              {
                from: lookbackDateRange.from.toISOString(),
                to: lookbackDateRange.to.toISOString(),
              },
            ],
          },
          aggs: {
            good: {
              sum: {
                field: 'slo.isGoodSlice',
              },
            },
            total: {
              value_count: {
                field: 'slo.isGoodSlice',
              },
            },
          },
        },
      };
    },
    {}
  );
}

function handleWindowedResult(
  aggregations: Record<WindowName, AggregationsDateRangeAggregate> | undefined,
  lookbackWindows: LookbackWindow[],
  slo: SLODefinition
): Array<{ burnRate: number; sli: number; name: WindowName }> {
  if (aggregations === undefined) {
    throw new InternalQueryError('Invalid aggregation response');
  }

  return lookbackWindows.map((lookbackWindow) => {
    const windowAggBuckets = aggregations[lookbackWindow.name]?.buckets ?? [];
    if (!Array.isArray(windowAggBuckets) || windowAggBuckets.length === 0) {
      throw new InternalQueryError('Invalid aggregation bucket response');
    }
    const bucket = windowAggBuckets[0];
    const good = (bucket.good as AggregationsSumAggregate).value;
    const total = (bucket.total as AggregationsValueCountAggregate).value;
    if (good === null || total === null) {
      throw new InternalQueryError('Invalid aggregation sum bucket response');
    }

    let sliValue;
    if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
      const dateRange = {
        from: new Date(bucket.from_as_string!),
        to: new Date(bucket.to_as_string!),
      };

      const totalSlices = getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);

      sliValue = computeSLI(good, total, totalSlices);
    } else {
      sliValue = computeSLI(good, total);
    }

    return {
      name: lookbackWindow.name,
      burnRate: computeBurnRate(slo, sliValue),
      sli: sliValue,
    };
  });
}
