/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  BulkSnapshotRequestItem,
  SnapshotResponse,
  SnapshotResult,
  SnapshotSummary,
} from '@kbn/slo-schema';
import { ALL_VALUE, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { groupBy, partition } from 'lodash';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import type { DateRange, SLODefinition } from '../domain/models';
import { computeSLI, computeSummaryStatus, toDateRange, toErrorBudget } from '../domain/services';
import { SLONotFound } from '../errors';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { getSlicesFromDateRange } from './utils/get_slices_from_date_range';

interface FoundRequest {
  slo: SLODefinition;
  req: BulkSnapshotRequestItem;
}

interface AggBucket {
  good: { value: number };
  total: { value: number };
}

interface TermsBucket extends AggBucket {
  key: string;
}

export class SnapshotService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly repository: SLODefinitionRepository,
    private readonly spaceId: string
  ) {}

  async compute(at: Date, id: string, instanceId?: string): Promise<SnapshotResponse> {
    const [definition] = await this.repository.findAllByIds([id]);
    if (!definition) {
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    const results = await this.computeGroup(at, [{ slo: definition, req: { id, instanceId } }]);

    return { at: at.toISOString(), results };
  }

  async bulkCompute(at: Date, requests: BulkSnapshotRequestItem[]): Promise<SnapshotResponse> {
    const uniqueIds = [...new Set(requests.map((r) => r.id))];
    const definitions = await this.repository.findAllByIds(uniqueIds);
    const definitionMap = new Map<string, SLODefinition>(definitions.map((d) => [d.id, d]));
    const results: SnapshotResult[] = [];
    const foundRequests: FoundRequest[] = [];

    for (const req of requests) {
      if (!definitionMap.has(req.id)) {
        results.push({
          id: req.id,
          instanceId: req.instanceId ?? ALL_VALUE,
          error: { statusCode: 404, message: `SLO [${req.id}] not found` },
        });
      } else {
        foundRequests.push({ slo: definitionMap.get(req.id)!, req });
      }
    }

    if (foundRequests.length === 0) {
      return { at: at.toISOString(), results };
    }

    const groups = Object.values(groupBy(foundRequests, (fr) => toTimeWindowKey(fr.slo)));
    const groupResults = await Promise.allSettled(
      groups.map((group) => this.computeGroup(at, group))
    );

    for (let g = 0; g < groupResults.length; g++) {
      const result = groupResults[g];
      if (result.status === 'fulfilled') {
        results.push(...result.value);
      } else {
        const message =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        for (const { slo, req } of groups[g]) {
          results.push({
            id: slo.id,
            instanceId: req.instanceId ?? ALL_VALUE,
            error: { statusCode: 500, message },
          });
        }
      }
    }

    return { at: at.toISOString(), results };
  }

  private async computeGroup(at: Date, group: FoundRequest[]): Promise<SnapshotResult[]> {
    const firstSlo = group[0].slo;
    const fullRange = toDateRange(firstSlo.timeWindow, at);
    // For calendar-aligned time windows, toDateRange extends `to` to the end of the
    // calendar period, which may be after the requested `at`. Clamp it so a historical
    // snapshot never aggregates rollup documents newer than the requested point in time.
    const dateRange: DateRange = {
      from: fullRange.from,
      to: fullRange.to.getTime() > at.getTime() ? at : fullRange.to,
    };

    const [wildcards, specifics] = partition(group, (fr) => isWildcard(fr.req));
    const uniqueSloIds = [...new Set(group.map((fr) => fr.slo.id))];

    const namedAggs: Record<string, AggregationsAggregationContainer> = {};

    specifics.forEach(({ slo, req }, i) => {
      namedAggs[`specific_${i}`] = {
        filter: {
          bool: {
            filter: [
              { term: { 'slo.id': slo.id } },
              { term: { 'slo.revision': slo.revision } },
              { term: { 'slo.instanceId': req.instanceId! } },
            ],
          },
        },
        aggs: buildMetricAggs(slo),
      };
    });

    wildcards.forEach(({ slo }, i) => {
      namedAggs[`wildcard_${i}`] = {
        filter: {
          bool: {
            filter: [{ term: { 'slo.id': slo.id } }, { term: { 'slo.revision': slo.revision } }],
          },
        },
        aggs: {
          instances: {
            terms: { field: 'slo.instanceId', size: 1000 },
            aggs: buildMetricAggs(slo),
          },
        },
      };
    });

    const response = await this.esClient.search({
      index: SLI_DESTINATION_INDEX_PATTERN,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { spaceId: this.spaceId } },
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
      aggs: namedAggs,
    });

    const aggs = response.aggregations as Record<string, unknown> | undefined;
    const results: SnapshotResult[] = [];

    specifics.forEach(({ slo, req }, i) => {
      const bucket = aggs?.[`specific_${i}`] as AggBucket | undefined;
      const good = bucket?.good?.value ?? 0;
      const total = bucket?.total?.value ?? 0;
      results.push({
        id: slo.id,
        instanceId: req.instanceId!,
        summary: toSnapshotSummary(slo, good, total, fullRange),
      });
    });

    wildcards.forEach(({ slo }, i) => {
      const wildcardAgg = aggs?.[`wildcard_${i}`] as
        | { instances?: { buckets?: TermsBucket[] } }
        | undefined;
      const buckets = wildcardAgg?.instances?.buckets ?? [];

      if (buckets.length === 0) {
        results.push({ id: slo.id, instanceId: ALL_VALUE, summary: toNoDataSummary(slo) });
      } else {
        for (const b of buckets) {
          results.push({
            id: slo.id,
            instanceId: b.key,
            summary: toSnapshotSummary(slo, b.good.value, b.total.value, fullRange),
          });
        }
      }
    });

    return results;
  }
}

const toTimeWindowKey = (slo: SLODefinition): string =>
  `${slo.timeWindow.type}_${slo.timeWindow.duration.format()}`;

const buildMetricAggs = (slo: SLODefinition) =>
  timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? {
        good: { sum: { field: 'slo.isGoodSlice' } },
        total: { value_count: { field: 'slo.isGoodSlice' } },
      }
    : {
        good: { sum: { field: 'slo.numerator' } },
        total: { sum: { field: 'slo.denominator' } },
      };

const toNoDataSummary = (slo: SLODefinition): SnapshotSummary => ({
  status: 'NO_DATA',
  sliValue: null,
  errorBudget: { initial: 1 - slo.objective.target, consumed: null, remaining: null },
  good: 0,
  total: 0,
});

const toSnapshotSummary = (
  slo: SLODefinition,
  good: number,
  total: number,
  // sliceRange must be the full (unclamped) time-window period so the timeslices denominator
  // matches historical_summary_client and summary_client: slices with no data count as good.
  sliceRange: DateRange
): SnapshotSummary => {
  const sliValue =
    timeslicesBudgetingMethodSchema.is(slo.budgetingMethod) && slo.objective.timesliceWindow
      ? computeSLI(good, total, getSlicesFromDateRange(sliceRange, slo.objective.timesliceWindow))
      : computeSLI(good, total);

  if (sliValue < 0) {
    return toNoDataSummary(slo);
  }

  const initial = 1 - slo.objective.target;
  const consumed = initial === 0 ? 0 : (1 - sliValue) / initial;
  const errorBudget = toErrorBudget(initial, consumed, false);

  return {
    status: computeSummaryStatus(slo.objective, sliValue, errorBudget),
    sliValue,
    errorBudget,
    good,
    total,
  };
};

const isWildcard = (req: BulkSnapshotRequestItem): boolean =>
  req.instanceId === undefined || req.instanceId === ALL_VALUE;
