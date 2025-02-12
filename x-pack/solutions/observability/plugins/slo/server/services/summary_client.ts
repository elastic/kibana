/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsValueCountAggregate } from '@elastic/elasticsearch/lib/api/types';
import {
  AggregationsSumAggregate,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  Duration,
  DurationUnit,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import { DateRange, Groupings, Meta, SLODefinition, Summary } from '../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../domain/services';
import { toDateRange } from '../domain/services/date_range';
import { BurnRatesClient } from './burn_rates_client';
import { getFlattenedGroupings } from './utils';
import { getSlicesFromDateRange } from './utils/get_slices_from_date_range';

interface Params {
  slo: SLODefinition;
  instanceId?: string;
  remoteName?: string;
}

interface SummaryResult {
  summary: Summary;
  groupings: Groupings;
  meta: Meta;
}

// This is called "SummaryClient" but is responsible for:
// - computing summary
// - formatting groupings
// - adding extra Meta parameter for synthetics
export interface SummaryClient {
  computeSummary(params: Params): Promise<SummaryResult>;
}

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient, private burnRatesClient: BurnRatesClient) {}

  async computeSummary({ slo, instanceId, remoteName }: Params): Promise<SummaryResult> {
    const dateRange = toDateRange(slo.timeWindow);
    const isDefinedWithGroupBy = ![slo.groupBy].flat().includes(ALL_VALUE);
    const hasInstanceId = instanceId !== ALL_VALUE;
    const shouldIncludeInstanceIdFilter = isDefinedWithGroupBy && hasInstanceId;

    const instanceIdFilter = shouldIncludeInstanceIdFilter
      ? [{ term: { 'slo.instanceId': instanceId } }]
      : [];

    const result = await this.esClient.search<
      any,
      {
        good: AggregationsSumAggregate;
        total: AggregationsSumAggregate;
        last_doc: AggregationsTopHitsAggregate;
      }
    >({
      index: remoteName
        ? `${remoteName}:${SLI_DESTINATION_INDEX_PATTERN}`
        : SLI_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'slo.id': slo.id } },
            { term: { 'slo.revision': slo.revision } },
            {
              range: {
                '@timestamp': {
                  gte: dateRange.from.toISOString(),
                  lte: dateRange.to.toISOString(),
                },
              },
            },
            ...instanceIdFilter,
          ],
        },
      },
      aggs: {
        ...(shouldIncludeInstanceIdFilter && {
          last_doc: {
            top_hits: {
              sort: [
                {
                  '@timestamp': {
                    order: 'desc',
                  },
                },
              ],
              _source: {
                includes: ['slo.groupings', 'monitor', 'observer', 'config_id'],
              },
              size: 1,
            },
          },
        }),
        ...buildAggs(slo),
      },
    });

    const source = result.aggregations?.last_doc?.hits?.hits?.[0]?._source;
    const groupings = source?.slo?.groupings;

    const sliValue = computeSliValue(slo, dateRange, result.aggregations);
    const errorBudget = computeErrorBudget(slo, sliValue);

    const burnRates = await this.burnRatesClient.calculate(
      slo,
      instanceId ?? ALL_VALUE,
      [
        { name: '5m', duration: new Duration(5, DurationUnit.Minute) },
        { name: '1h', duration: new Duration(1, DurationUnit.Hour) },
        { name: '1d', duration: new Duration(1, DurationUnit.Day) },
      ],
      remoteName
    );

    return {
      summary: {
        sliValue,
        errorBudget,
        status: computeSummaryStatus(slo.objective, sliValue, errorBudget),
        fiveMinuteBurnRate: getBurnRate('5m', burnRates),
        oneHourBurnRate: getBurnRate('1h', burnRates),
        oneDayBurnRate: getBurnRate('1d', burnRates),
      },
      groupings: groupings ? getFlattenedGroupings({ groupBy: slo.groupBy, groupings }) : {},
      meta: getMetaFields(slo, source ?? {}),
    };
  }
}

function buildAggs(slo: SLODefinition) {
  return timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? {
        good: { sum: { field: 'slo.isGoodSlice' } },
        total: { value_count: { field: 'slo.isGoodSlice' } },
      }
    : {
        good: { sum: { field: 'slo.numerator' } },
        total: { sum: { field: 'slo.denominator' } },
      };
}

function getMetaFields(
  slo: SLODefinition,
  source: { monitor?: { id?: string }; config_id?: string; observer?: { name?: string } }
): Meta {
  const {
    indicator: { type },
  } = slo;
  switch (type) {
    case 'sli.synthetics.availability':
      return {
        synthetics: {
          monitorId: source.monitor?.id ?? '',
          locationId: source.observer?.name ?? '',
          configId: source.config_id ?? '',
        },
      };
    default:
      return {};
  }
}

interface BurnRateBucket {
  good: AggregationsSumAggregate;
  total: AggregationsSumAggregate | AggregationsValueCountAggregate;
}

function computeSliValue(
  slo: SLODefinition,
  dateRange: DateRange,
  bucket: BurnRateBucket | undefined
) {
  const good = bucket?.good?.value ?? 0;
  const total = bucket?.total?.value ?? 0;

  if (timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)) {
    const totalSlices = getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!);

    return computeSLI(good, total, totalSlices);
  }

  return computeSLI(good, total);
}

function computeErrorBudget(slo: SLODefinition, sliValue: number) {
  const initialErrorBudget = 1 - slo.objective.target;
  const consumedErrorBudget = sliValue < 0 ? 0 : (1 - sliValue) / initialErrorBudget;

  return toErrorBudget(
    initialErrorBudget,
    consumedErrorBudget,
    calendarAlignedTimeWindowSchema.is(slo.timeWindow) &&
      occurrencesBudgetingMethodSchema.is(slo.budgetingMethod)
  );
}

function getBurnRate(burnRateWindow: string, burnRates: Array<{ name: string; burnRate: number }>) {
  return burnRates.find(({ name }) => name === burnRateWindow)?.burnRate ?? 0;
}
