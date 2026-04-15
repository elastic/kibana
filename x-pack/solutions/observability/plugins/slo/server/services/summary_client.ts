/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsValueCountAggregate } from '@elastic/elasticsearch/lib/api/types';
import type {
  AggregationsSumAggregate,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { BudgetingMethod } from '@kbn/slo-schema';
import {
  ALL_VALUE,
  calendarAlignedTimeWindowSchema,
  Duration,
  DurationUnit,
  occurrencesBudgetingMethodSchema,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import type { DateRange, Groupings, Meta, SLODefinition, Summary } from '../domain/models';
import type { TimeWindow } from '../domain/models/time_window';
import { computeSLI, computeSummaryStatus, toErrorBudget } from '../domain/services';
import { toDateRange } from '../domain/services/date_range';
import type { BurnRatesClient } from './burn_rates_client';
import { getFlattenedGroupings } from './utils';
import { getSlicesFromDateRange } from './utils/get_slices_from_date_range';

interface Params {
  slo: SLODefinition;
  instanceId?: string;
  remoteName?: string;
  timeWindowOverride?: TimeWindow;
  budgetingMethodOverride?: BudgetingMethod;
}

export interface BurnRateWindow {
  name: string;
  burnRate: number;
  sli: number;
}

interface SummaryResult {
  summary: Summary;
  groupings: Groupings;
  meta: Meta;
  burnRateWindows: BurnRateWindow[];
}

export interface SummaryClient {
  computeSummary(params: Params): Promise<SummaryResult>;
  computeSummaries(paramsList: Params[]): Promise<SummaryResult[]>;
}

const DEFAULT_BURN_RATE_WINDOWS = [
  { name: '5m', duration: new Duration(5, DurationUnit.Minute) },
  { name: '1h', duration: new Duration(1, DurationUnit.Hour) },
  { name: '1d', duration: new Duration(1, DurationUnit.Day) },
];

interface ResolvedParams {
  slo: SLODefinition;
  instanceId?: string;
  remoteName?: string;
  dateRange: DateRange;
  shouldIncludeInstanceIdFilter: boolean;
  index: string;
  budgetingMethodOverride?: BudgetingMethod;
}

const resolveIndex = (remoteName?: string) =>
  remoteName ? `${remoteName}:${SLI_DESTINATION_INDEX_PATTERN}` : SLI_DESTINATION_INDEX_PATTERN;

const resolveParams = ({
  slo,
  instanceId,
  remoteName,
  timeWindowOverride,
  budgetingMethodOverride,
}: Params): ResolvedParams => {
  const dateRange = toDateRange(timeWindowOverride ?? slo.timeWindow);
  const isDefinedWithGroupBy = ![slo.groupBy].flat().includes(ALL_VALUE);
  const hasInstanceId = instanceId != null && instanceId !== ALL_VALUE;
  const shouldIncludeInstanceIdFilter = isDefinedWithGroupBy && hasInstanceId;

  return {
    slo,
    instanceId,
    remoteName,
    dateRange,
    shouldIncludeInstanceIdFilter,
    index: resolveIndex(remoteName),
    budgetingMethodOverride,
  };
};

function buildMemberAggs({
  slo,
  shouldIncludeInstanceIdFilter,
}: Pick<ResolvedParams, 'slo' | 'shouldIncludeInstanceIdFilter'>) {
  return {
    ...(shouldIncludeInstanceIdFilter && {
      last_doc: {
        top_hits: {
          sort: [{ '@timestamp': { order: 'desc' as const } }],
          _source: {
            includes: ['slo.groupings', 'monitor', 'observer', 'config_id'],
          },
          size: 1,
        },
      },
    }),
    ...buildAggs(slo),
  };
}

const buildSearchBody = ({
  slo,
  instanceId,
  dateRange,
  shouldIncludeInstanceIdFilter,
}: ResolvedParams) => {
  const instanceIdFilter = shouldIncludeInstanceIdFilter
    ? [{ term: { 'slo.instanceId': instanceId } }]
    : [];

  return {
    size: 0 as const,
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
    aggs: buildMemberAggs({ slo, shouldIncludeInstanceIdFilter }),
  };
};

interface SummaryAggregations {
  good: AggregationsSumAggregate;
  total: AggregationsSumAggregate;
  last_doc?: AggregationsTopHitsAggregate;
}

const toSummaryResult = (
  slo: SLODefinition,
  dateRange: DateRange,
  aggregations: SummaryAggregations | undefined,
  burnRates: BurnRateWindow[],
  budgetingMethodOverride?: BudgetingMethod
): SummaryResult => {
  const source = aggregations?.last_doc?.hits?.hits?.[0]?._source as
    | {
        slo?: { groupings?: Groupings };
        monitor?: { id?: string };
        config_id?: string;
        observer?: { name?: string };
      }
    | undefined;
  const groupings = source?.slo?.groupings;

  const sliValue = computeSliValue(slo, dateRange, aggregations, budgetingMethodOverride);
  const errorBudget = computeErrorBudget(slo, sliValue);

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
    burnRateWindows: burnRates,
  };
};

export class DefaultSummaryClient implements SummaryClient {
  constructor(private esClient: ElasticsearchClient, private burnRatesClient: BurnRatesClient) {}

  async computeSummary(params: Params): Promise<SummaryResult> {
    const resolved = resolveParams(params);
    const { slo, instanceId, remoteName, dateRange, index, budgetingMethodOverride } = resolved;

    const result = await this.esClient.search<any, SummaryAggregations>({
      index,
      ...buildSearchBody(resolved),
    });

    const burnRates = await this.burnRatesClient.calculate(
      slo,
      instanceId ?? ALL_VALUE,
      DEFAULT_BURN_RATE_WINDOWS,
      remoteName
    );

    return toSummaryResult(slo, dateRange, result.aggregations, burnRates, budgetingMethodOverride);
  }

  async computeSummaries(paramsList: Params[]): Promise<SummaryResult[]> {
    if (paramsList.length === 0) {
      return [];
    }

    const resolvedList = paramsList.map(resolveParams);

    const canUseNamedFilters =
      resolvedList.length > 1 &&
      resolvedList.every(
        (r) =>
          r.index === resolvedList[0].index &&
          r.dateRange.from.getTime() === resolvedList[0].dateRange.from.getTime() &&
          r.dateRange.to.getTime() === resolvedList[0].dateRange.to.getTime()
      );

    const burnRateBatchParams = resolvedList.map(({ slo, instanceId, remoteName }) => ({
      slo,
      instanceId: instanceId ?? ALL_VALUE,
      lookbackWindows: DEFAULT_BURN_RATE_WINDOWS,
      remoteName,
    }));

    const [summaryAggregations, allBurnRates] = await Promise.all([
      canUseNamedFilters
        ? this.computeSummariesWithNamedFilters(resolvedList)
        : this.computeSummariesWithMsearch(resolvedList),
      this.burnRatesClient.calculateBatch(burnRateBatchParams),
    ]);

    return resolvedList.map(({ slo, dateRange, budgetingMethodOverride }, i) => {
      const aggs = summaryAggregations[i];
      if (!aggs) {
        return buildNoDataResult(slo);
      }
      return toSummaryResult(slo, dateRange, aggs, allBurnRates[i], budgetingMethodOverride);
    });
  }

  private async computeSummariesWithMsearch(
    resolvedList: ResolvedParams[]
  ): Promise<Array<SummaryAggregations | undefined>> {
    const summarySearches = resolvedList.flatMap((resolved) => [
      { index: resolved.index },
      buildSearchBody(resolved),
    ]);

    const summaryResult = await this.esClient.msearch({ searches: summarySearches });

    return resolvedList.map((_, i) => {
      const response = summaryResult.responses[i];
      if ('error' in response) {
        return undefined;
      }
      return response.aggregations as SummaryAggregations | undefined;
    });
  }

  private async computeSummariesWithNamedFilters(
    resolvedList: ResolvedParams[]
  ): Promise<Array<SummaryAggregations | undefined>> {
    const { index, dateRange } = resolvedList[0];
    const uniqueSloIds = [...new Set(resolvedList.map((r) => r.slo.id))];

    // Each member gets its own named filter aggregation keyed by index,
    // containing the per-member filter (slo.id, revision, instanceId) and
    // the appropriate metric sub-aggregations.
    const memberAggs: Record<string, any> = {};
    for (let i = 0; i < resolvedList.length; i++) {
      const resolved = resolvedList[i];
      const filterClauses = [
        { term: { 'slo.id': resolved.slo.id } },
        { term: { 'slo.revision': resolved.slo.revision } },
        ...(resolved.shouldIncludeInstanceIdFilter
          ? [{ term: { 'slo.instanceId': resolved.instanceId } }]
          : []),
      ];

      memberAggs[`member_${i}`] = {
        filter: { bool: { filter: filterClauses } },
        aggs: buildMemberAggs(resolved),
      };
    }

    const result = await this.esClient.search({
      index,
      size: 0,
      query: {
        bool: {
          filter: [
            { terms: { 'slo.id': uniqueSloIds } },
            {
              range: {
                '@timestamp': {
                  gte: dateRange.from.toISOString(),
                  lte: dateRange.to.toISOString(),
                },
              },
            },
          ],
        },
      },
      aggs: memberAggs,
    });

    const aggregations = result.aggregations as Record<string, any> | undefined;

    return resolvedList.map((_, i) => {
      const bucket = aggregations?.[`member_${i}`];
      if (!bucket) {
        return undefined;
      }
      return {
        good: bucket.good,
        total: bucket.total,
        ...(bucket.last_doc ? { last_doc: bucket.last_doc } : {}),
      } as SummaryAggregations;
    });
  }
}

function buildNoDataResult(slo: SLODefinition): SummaryResult {
  return {
    summary: {
      sliValue: -1,
      errorBudget: { initial: 0, consumed: 0, remaining: 0, isEstimated: false },
      status: 'NO_DATA',
      fiveMinuteBurnRate: 0,
      oneHourBurnRate: 0,
      oneDayBurnRate: 0,
    },
    groupings: {},
    meta: getMetaFields(slo, {}),
    burnRateWindows: [],
  };
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
  bucket: BurnRateBucket | undefined,
  budgetingMethodOverride?: BudgetingMethod
) {
  const good = bucket?.good?.value ?? 0;
  const total = bucket?.total?.value ?? 0;
  const budgetingMethod = budgetingMethodOverride ?? slo.budgetingMethod;

  if (timeslicesBudgetingMethodSchema.is(budgetingMethod) && slo.objective.timesliceWindow) {
    const totalSlices = getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow);

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
