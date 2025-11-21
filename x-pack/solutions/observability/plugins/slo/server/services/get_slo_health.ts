/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TransformGetTransformStatsTransformStats,
  AggregationsAggregate,
  FieldValue,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { FetchSLOHealthParams, FetchSLOHealthResponse } from '@kbn/slo-schema';
import { fetchSLOHealthResponseSchema } from '@kbn/slo-schema';
import { type Dictionary, keyBy } from 'lodash';
import moment from 'moment';
import {
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
} from '../../common/constants';
import type { HealthStatus, State } from '../domain/models/health';
import type { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';

const LAG_THRESHOLD_MINUTES = 10;
const STALE_THRESHOLD_MINUTES = 2 * 24 * 60;
const ES_PAGESIZE_LIMIT = 1000;

interface SloData {
  sloId: string;
  sloRevision: number;
  sloName: string;
  summaryDoc: EsSummaryDocument;
  hasOnlyTempSummaryDoc: boolean;
}

function getAfterKey(
  agg: AggregationsAggregate | undefined
): Record<string, FieldValue> | undefined {
  if (agg && typeof agg === 'object' && 'after_key' in agg && agg.after_key) {
    return agg.after_key as Record<string, FieldValue>;
  }
  return undefined;
}

export class GetSLOHealth {
  constructor(private scopedClusterClient: IScopedClusterClient) {}

  public async execute(params: FetchSLOHealthParams): Promise<FetchSLOHealthResponse> {
    let afterKey: AggregationsAggregate | undefined;
    let sloKeysFromES: Array<SloData> = [];

    const page = params.page ?? 0;
    const perPage = params.perPage ?? 20;

    do {
      const sloIdCompositeQueryResponse = await this.scopedClusterClient.asCurrentUser.search({
        index: SUMMARY_DESTINATION_INDEX_PATTERN,
        size: 0,
        aggs: {
          sloIds: {
            composite: {
              after: afterKey as Record<string, FieldValue>,
              size: ES_PAGESIZE_LIMIT,
              sources: [
                {
                  sloId: { terms: { field: 'slo.id' } },
                },
                {
                  sloRevision: { terms: { field: 'slo.revision' } },
                },
                {
                  sloName: { terms: { field: 'slo.name.keyword' } },
                },
              ],
            },
            aggs: {
              summaryDoc: {
                top_hits: {
                  size: 1,
                },
              },
              nonTempSummaryDocs: {
                filter: {
                  term: { isTempDoc: false },
                },
              },
            },
          },
        },
        ...(params.list?.length && {
          query: {
            bool: {
              filter: [{ terms: { 'slo.id': params.list.map((slo) => slo.sloId) } }],
            },
          },
        }),
      });

      afterKey = getAfterKey(sloIdCompositeQueryResponse.aggregations?.sloIds);

      const buckets = (
        sloIdCompositeQueryResponse.aggregations?.sloIds as {
          buckets?: Array<{
            key: { sloId: string; sloRevision: number; sloName: string };
            summaryDoc: { hits: { hits: Array<{ _source: EsSummaryDocument }> } };
            nonTempSummaryDocs: {
              doc_count: number;
            };
          }>;
        }
      )?.buckets;

      if (buckets && buckets.length > 0) {
        sloKeysFromES = sloKeysFromES.concat([
          ...buckets.map((bucket) => {
            return {
              sloId: bucket.key.sloId,
              sloRevision: bucket.key.sloRevision,
              sloName: bucket.key.sloName,
              summaryDoc: bucket.summaryDoc.hits.hits[0]._source!,
              hasOnlyTempSummaryDoc: bucket.nonTempSummaryDocs.doc_count === 0,
            };
          }),
        ]);
      }
    } while (afterKey);

    const filteredList = sloKeysFromES.map((item) => ({
      sloId: item.sloId,
      sloRevision: item.sloRevision,
      sloName: item.sloName,
      summaryDoc: item.summaryDoc,
      hasOnlyTempSummaryDoc: item.hasOnlyTempSummaryDoc,
    }));

    const results = await Promise.all(
      filteredList.map(async (item) => {
        const transformStatsById = await this.getTransformStatsForSLO(item);
        const health = computeHealth(transformStatsById, item);
        const state = computeState(item);

        return {
          sloId: item.sloId,
          sloName: item.sloName,
          sloRevision: item.sloRevision,
          state,
          health,
        };
      })
    );

    const mappedResults = Array.from(
      new Map(results.map((item) => [`${item.sloId}-${item.sloRevision}`, item])).values()
    );

    const uniqueResults = params.statusFilter
      ? mappedResults.filter((item) => item.health.overall === params.statusFilter)
      : mappedResults;

    return fetchSLOHealthResponseSchema.encode({
      data: uniqueResults.slice(page * perPage, (page + 1) * perPage),
      page,
      perPage,
      total: uniqueResults.length,
    });
  }

  private async getTransformStatsForSLO(item: {
    sloId: string;
    sloRevision: number;
  }): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
    const rollupTransformStats =
      await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
        {
          transform_id: getSLOTransformId(item.sloId, item.sloRevision),
          allow_no_match: true,
          size: 1,
        },
        { ignore: [404] }
      );

    const summaryTransformStats =
      await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
        {
          transform_id: getSLOSummaryTransformId(item.sloId, item.sloRevision),
          allow_no_match: true,
          size: 1,
        },
        { ignore: [404] }
      );

    const allTransforms = [
      ...(rollupTransformStats.transforms || []),
      ...(summaryTransformStats.transforms || []),
    ];

    return keyBy(allTransforms, (transform) => transform.id);
  }
}

function computeState(item: SloData): State {
  const sloSummaryDoc = item.summaryDoc;

  let state: State = 'no_data';

  const latestSliTimestamp = sloSummaryDoc?.latestSliTimestamp;
  const summaryUpdatedAt = sloSummaryDoc?.summaryUpdatedAt;

  if (item.hasOnlyTempSummaryDoc) {
    state = 'no_data';
  } else if (summaryUpdatedAt && latestSliTimestamp) {
    const summaryLag = moment().diff(new Date(summaryUpdatedAt), 'minute');
    const indexingLag = moment(summaryUpdatedAt).diff(new Date(latestSliTimestamp), 'minute');

    // When the summaryUpdatedAt is greater than STALE_THRESHOLD_MINUTES minutes, the SLO is considered stale since no new data triggered a summary document update.
    // When the difference between the summaryUpdatedAt and the latestSliTimestamp is
    // - Below LAG_THRESHOLD_MINUTES minutes, the SLO has cought up with the sli data, and is running correctly
    // - Above LAG_THRESHOLD_MINUTES minutes, the SLO is indexing
    if (summaryLag > STALE_THRESHOLD_MINUTES) {
      state = 'stale';
    } else {
      state = indexingLag >= LAG_THRESHOLD_MINUTES ? 'indexing' : 'running';
    }
  }
  return state;
}

function getTransformHealth(
  transformStat?: TransformGetTransformStatsTransformStats
): HealthStatus {
  if (!transformStat) {
    return {
      status: 'missing',
    };
  }
  const transformState = transformStat.state?.toLowerCase();
  return transformStat.health?.status?.toLowerCase() === 'green'
    ? {
        status: 'healthy',
        transformState: transformState as HealthStatus['transformState'],
      }
    : {
        status: 'unhealthy',
        transformState: transformState as HealthStatus['transformState'],
      };
}

function computeHealth(
  transformStatsById: Dictionary<TransformGetTransformStatsTransformStats>,
  item: SloData
): { overall: 'healthy' | 'unhealthy'; rollup: HealthStatus; summary: HealthStatus } {
  const rollup = getTransformHealth(
    transformStatsById[getSLOTransformId(item.sloId, item.sloRevision)]
  );
  const summary = getTransformHealth(
    transformStatsById[getSLOSummaryTransformId(item.sloId, item.sloRevision)]
  );

  const overall: 'healthy' | 'unhealthy' =
    rollup.status === 'healthy' && summary.status === 'healthy' ? 'healthy' : 'unhealthy';

  return { overall, rollup, summary };
}
