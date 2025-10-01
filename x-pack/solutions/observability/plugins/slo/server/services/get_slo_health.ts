/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { FetchSLOHealthParams, FetchSLOHealthResponse } from '@kbn/slo-schema';
import { fetchSLOHealthResponseSchema } from '@kbn/slo-schema';
import type { AggregationsAggregate, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { Dictionary } from 'lodash';
import { groupBy, keyBy } from 'lodash';
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
    let sloKeysFromES: Array<{ sloId: string; sloInstanceId: string; sloRevision: number }> = [];

    do {
      const sloIdCompositeQueryResponse = await this.scopedClusterClient.asCurrentUser.search({
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
              ],
            },
          },
        },
        index: '.slo-observability.summary-*',
        _source: ['slo.id', 'slo.instanceId', 'slo.revision'],
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
          buckets?: Array<{ key: { sloId: string; sloInstanceId: string; sloRevision: number } }>;
        }
      )?.buckets;
      if (buckets && buckets.length > 0) {
        sloKeysFromES = sloKeysFromES.concat([
          ...buckets.map((bucket) => {
            return {
              sloId: bucket.key.sloId,
              sloInstanceId: bucket.key.sloInstanceId,
              sloRevision: bucket.key.sloRevision,
            };
          }),
        ]);
      }
    } while (afterKey);

    // let filteredList = sloKeysFromES.map((item) => ({
    //   sloId: item.sloId,
    //   sloInstanceId: item.sloInstanceId,
    //   sloRevision: item.sloRevision,
    // }));

    let filteredList: any[] = [];

    for (let i = 0; i < 100; i++) {
      filteredList = filteredList.concat({
        sloId: '770a62cb-f103-478d-b34c-b310c8e80b8e',
        // sloInstanceId: 'ES-Air',
        sloRevision: 1,
      });
    }

    const transformStatsById = await this.getTransformStats(filteredList);
    const summaryDocsById = await this.getSummaryDocsById(filteredList);

    const results = filteredList.map((item) => {
      const health = computeHealth(transformStatsById, item);
      const state = computeState(summaryDocsById, item);

      return {
        sloId: item.sloId,
        sloInstanceId: item.sloInstanceId,
        sloRevision: item.sloRevision,
        state,
        health,
      };
    });

    // REVERT FROM TESTING
    const mappedResults = results; // Array.from(new Map(results.map((item) => [item.sloId, item])).values());

    // If a statusFilter is provided, we need to filter the results accordingly.
    // We also need to ensure that we return only unique SLO IDs, as there might be multiple instances.
    const uniqueResults = params.statusFilter
      ? mappedResults.filter((item) => item.health.overall === params.statusFilter)
      : mappedResults;

    return fetchSLOHealthResponseSchema.encode({
      data: uniqueResults.slice(0, 1000), // limit to 1000 results to avoid too large responses
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

  /*
  TODO: debug this
  */
  private async getTransformStats(
    sloList: { sloId: string; sloRevision: number }[]
  ): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
    const transformStats =
      await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
        {
          transform_id: sloList
            .map((slo: { sloId: string; sloRevision: number }) => [
              getSLOTransformId(slo.sloId, slo.sloRevision),
              getSLOSummaryTransformId(slo.sloId, slo.sloRevision),
            ])
            .flat(),
          allow_no_match: true,
          size: sloList.length * 2,
        },
        { ignore: [404] }
      );

    return keyBy(transformStats.transforms, (transform) => transform.id);
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
  return transformStat?.health?.status?.toLowerCase() === 'green' ? 'healthy' : 'unhealthy';
}

function computeHealth(
  transformStatsById: Dictionary<TransformGetTransformStatsTransformStats>,
  item: { sloId: string; sloInstanceId: string; sloRevision: number }
): { overall: HealthStatus; rollup: HealthStatus; summary: HealthStatus } {
  const rollup = getTransformHealth(
    transformStatsById[getSLOTransformId(item.sloId, item.sloRevision)]
  );
  const summary = getTransformHealth(
    transformStatsById[getSLOSummaryTransformId(item.sloId, item.sloRevision)]
  );

  const overall: HealthStatus =
    rollup === 'healthy' && summary === 'healthy' ? 'healthy' : 'unhealthy';

  return { overall, rollup, summary };
}
