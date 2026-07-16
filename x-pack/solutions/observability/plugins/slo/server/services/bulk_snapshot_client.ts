/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ALL_VALUE,
  timeslicesBudgetingMethodSchema,
} from '@kbn/slo-schema';
import type {
  BulkSnapshotRequestItem,
  BulkSnapshotResponse,
  SnapshotResult,
  SnapshotSummary,
} from '@kbn/slo-schema';
import { SLI_DESTINATION_INDEX_PATTERN } from '../../common/constants';
import type { DateRange, SLODefinition } from '../domain/models';
import { computeSLI, computeSummaryStatus, toErrorBudget, toDateRange } from '../domain/services';
import type { SLODefinitionRepository } from './slo_definition_repository';
import { getSlicesFromDateRange } from './utils/get_slices_from_date_range';

interface FoundRequest {
  originalIndex: number;
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
  dateRange: DateRange
): SnapshotSummary => {
  const sliValue = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? computeSLI(good, total, getSlicesFromDateRange(dateRange, slo.objective.timesliceWindow!))
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
    errorBudget: { initial: errorBudget.initial, consumed: errorBudget.consumed, remaining: errorBudget.remaining },
    good,
    total,
  };
};

const isWildcard = (req: BulkSnapshotRequestItem): boolean =>
  req.instanceId === undefined || req.instanceId === ALL_VALUE;

export class BulkSnapshotClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly repository: SLODefinitionRepository,
    private readonly spaceId: string
  ) {}

  async compute(at: Date, requests: BulkSnapshotRequestItem[]): Promise<BulkSnapshotResponse> {
    const uniqueIds = [...new Set(requests.map((r) => r.id))];
    const definitions = await this.repository.findAllByIds(uniqueIds);
    const definitionMap = new Map<string, SLODefinition>(definitions.map((d) => [d.id, d]));
    const missingIds = new Set(uniqueIds.filter((id) => !definitionMap.has(id)));

    const placeholders: Array<SnapshotResult[]> = new Array(requests.length);

    const foundRequests: FoundRequest[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      if (missingIds.has(req.id)) {
        placeholders[i] = [
          {
            id: req.id,
            instanceId: req.instanceId ?? ALL_VALUE,
            error: { statusCode: 404, message: `SLO [${req.id}] not found` },
          },
        ];
      } else {
        foundRequests.push({ originalIndex: i, slo: definitionMap.get(req.id)!, req });
      }
    }

    if (foundRequests.length === 0) {
      return { at: at.toISOString(), results: placeholders.flat() };
    }

    const grouped = new Map<string, FoundRequest[]>();
    for (const fr of foundRequests) {
      const key = toTimeWindowKey(fr.slo);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(fr);
    }

    const groupResults = await Promise.allSettled(
      [...grouped.values()].map((group) => this.computeGroup(at, group))
    );

    for (const result of groupResults) {
      if (result.status === 'fulfilled') {
        const { assignments } = result.value;
        for (const { index, results } of assignments) {
          placeholders[index] = results;
        }
      }
    }

    return { at: at.toISOString(), results: placeholders.flat() };
  }

  private async computeGroup(
    at: Date,
    group: FoundRequest[]
  ): Promise<{ assignments: Array<{ index: number; results: SnapshotResult[] }> }> {
    const firstSlo = group[0].slo;
    const dateRange = toDateRange(firstSlo.timeWindow, at);

    const specifics = group.filter((fr) => !isWildcard(fr.req));
    const wildcards = group.filter((fr) => isWildcard(fr.req));

    const uniqueSloIds = [...new Set(group.map((fr) => fr.slo.id))];

    const namedAggs: Record<string, unknown> = {};

    for (let i = 0; i < specifics.length; i++) {
      const { slo, req } = specifics[i];
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
    }

    for (let i = 0; i < wildcards.length; i++) {
      const { slo } = wildcards[i];
      namedAggs[`wildcard_${i}`] = {
        filter: {
          bool: {
            filter: [
              { term: { 'slo.id': slo.id } },
              { term: { 'slo.revision': slo.revision } },
            ],
          },
        },
        aggs: {
          instances: {
            terms: { field: 'slo.instanceId', size: 1000 },
            aggs: buildMetricAggs(slo),
          },
        },
      };
    }

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
    const assignments: Array<{ index: number; results: SnapshotResult[] }> = [];

    for (let i = 0; i < specifics.length; i++) {
      const { originalIndex, slo, req } = specifics[i];
      const bucket = aggs?.[`specific_${i}`] as AggBucket | undefined;
      const good = bucket?.good?.value ?? 0;
      const total = bucket?.total?.value ?? 0;
      assignments.push({
        index: originalIndex,
        results: [
          {
            id: slo.id,
            instanceId: req.instanceId!,
            summary: toSnapshotSummary(slo, good, total, dateRange),
          },
        ],
      });
    }

    for (let i = 0; i < wildcards.length; i++) {
      const { originalIndex, slo } = wildcards[i];
      const wildcardAgg = aggs?.[`wildcard_${i}`] as
        | { instances?: { buckets?: TermsBucket[] } }
        | undefined;
      const buckets = wildcardAgg?.instances?.buckets ?? [];

      if (buckets.length === 0) {
        assignments.push({
          index: originalIndex,
          results: [{ id: slo.id, instanceId: ALL_VALUE, summary: toNoDataSummary(slo) }],
        });
      } else {
        assignments.push({
          index: originalIndex,
          results: buckets.map((b) => ({
            id: slo.id,
            instanceId: b.key,
            summary: toSnapshotSummary(slo, b.good.value, b.total.value, dateRange),
          })),
        });
      }
    }

    return { assignments };
  }
}
