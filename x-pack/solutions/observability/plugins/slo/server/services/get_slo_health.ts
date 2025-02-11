/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, IScopedClusterClient } from '@kbn/core/server';
import {
  FetchSLOHealthParams,
  FetchSLOHealthResponse,
  fetchSLOHealthResponseSchema,
} from '@kbn/slo-schema';
import { Dictionary, groupBy, keyBy } from 'lodash';
import moment from 'moment';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../common/constants';
import { SLODefinition } from '../domain/models';
import { HealthStatus, State } from '../domain/models/health';
import { SLORepository } from './slo_repository';
import { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';

const LAG_THRESHOLD_MINUTES = 10;
const STALE_THRESHOLD_MINUTES = 2 * 24 * 60;

export class GetSLOHealth {
  constructor(
    private esClient: ElasticsearchClient,
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository
  ) {}

  public async execute(params: FetchSLOHealthParams): Promise<FetchSLOHealthResponse> {
    const sloIds = params.list.map(({ sloId }) => sloId);
    const sloList = await this.repository.findAllByIds(sloIds);
    const sloById = keyBy(sloList, 'id');

    const filteredList = params.list
      .filter((item) => !!sloById[item.sloId])
      .map((item) => ({
        sloId: item.sloId,
        sloInstanceId: item.sloInstanceId,
        sloRevision: sloById[item.sloId].revision,
      }));

    const transformStatsById = await this.getTransformStats(sloList);
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

    return fetchSLOHealthResponseSchema.encode(results);
  }

  private async getSummaryDocsById(
    filteredList: Array<{ sloId: string; sloInstanceId: string; sloRevision: number }>
  ) {
    const summaryDocs = await this.esClient.search<EsSummaryDocument>({
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

  private async getTransformStats(
    sloList: SLODefinition[]
  ): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
    const transformStats =
      await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
        {
          transform_id: sloList
            .map((slo: SLODefinition) => [
              getSLOTransformId(slo.id, slo.revision),
              getSLOSummaryTransformId(slo.id, slo.revision),
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
