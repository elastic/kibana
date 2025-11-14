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
import { type Dictionary, groupBy, keyBy } from 'lodash';
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
    let sloKeysFromES: Array<{
      sloId: string;
      sloInstanceId: string;
      sloRevision: number;
      sloName: string;
    }> = [];

    const page = typeof params.page === 'number' && params.page >= 0 ? params.page : 0;
    const perPage =
      typeof params.perPage === 'number' && params.perPage >= 1 && params.perPage <= 100
        ? params.perPage
        : 100;

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
                  sloInstanceId: { terms: { field: 'slo.instanceId' } },
                },
                {
                  sloRevision: { terms: { field: 'slo.revision' } },
                },
                {
                  sloName: { terms: { field: 'slo.name.keyword' } },
                },
              ],
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
            key: { sloId: string; sloInstanceId: string; sloRevision: number; sloName: string };
          }>;
        }
      )?.buckets;

      if (buckets && buckets.length > 0) {
        sloKeysFromES = sloKeysFromES.concat([
          ...buckets.map((bucket) => {
            return {
              sloId: bucket.key.sloId,
              sloInstanceId: bucket.key.sloInstanceId,
              sloRevision: bucket.key.sloRevision,
              sloName: bucket.key.sloName,
            };
          }),
        ]);
      }
    } while (afterKey);

    const filteredList = sloKeysFromES.map((item) => ({
      sloId: item.sloId,
      sloInstanceId: item.sloInstanceId,
      sloRevision: item.sloRevision,
      sloName: item.sloName,
    }));

    const summaryDocsById = await this.getSummaryDocsById(filteredList);

    const results = await Promise.all(
      filteredList.map(async (item) => {
        const transformStatsById = await this.getTransformStatsForSLO(item);
        const health = computeHealth(transformStatsById, item);
        const state = computeState(summaryDocsById, item);

        return {
          sloId: item.sloId,
          sloName: item.sloName,
          sloInstanceId: item.sloInstanceId,
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

  private async getSummaryDocsById(
    filteredList: Array<{ sloId: string; sloInstanceId: string; sloRevision: number }>
  ) {
    const summaryDocs = await this.scopedClusterClient.asCurrentUser.search<EsSummaryDocument>({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: filteredList.map((item) => ({
            bool: {
              must: [
                { term: { 'slo.id': item.sloId } },
                { term: { 'slo.instanceId': item.sloInstanceId } },
              ],
            },
          })),
        },
      },
    });

    const summaryDocsById = groupBy(
      summaryDocs.hits.hits.map((hit) => hit._source!),
      (doc: EsSummaryDocument) => buildSummaryKey(doc.slo.id, doc.slo.instanceId)
    );
    return summaryDocsById;
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

function buildSummaryKey(id: string, instanceId: string) {
  return id + '|' + instanceId;
}

function computeState(
  summaryDocsById: Dictionary<EsSummaryDocument[]>,
  item: { sloId: string; sloInstanceId: string; sloRevision: number }
): State {
  const sloSummaryDocs = summaryDocsById[buildSummaryKey(item.sloId, item.sloInstanceId)];

  let state: State = 'no_data';
  if (!sloSummaryDocs) {
    return state;
  }
  const hasOnlyTempSummaryDoc = sloSummaryDocs.every((doc) => doc.isTempDoc); // only temporary documents mean the summary transform did not run yet
  const sloSummarydoc = sloSummaryDocs.find((doc) => !doc.isTempDoc);
  const latestSliTimestamp = sloSummarydoc?.latestSliTimestamp;
  const summaryUpdatedAt = sloSummarydoc?.summaryUpdatedAt;

  if (hasOnlyTempSummaryDoc) {
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
  item: { sloId: string; sloInstanceId: string; sloRevision: number }
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
