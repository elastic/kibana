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
import { groupBy, keyBy, map, uniq, type Dictionary } from 'lodash';
import moment from 'moment';
import {
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardTransformId,
} from '../../common/constants';
import type { SLODefinition } from '../domain/models';
import type { HealthStatus, State } from '../domain/models/health';
import type { SLORepository } from './slo_repository';
import type { EsSummaryDocument } from './summary_transform_generator/helpers/create_temp_summary';

const LAG_THRESHOLD_MINUTES = 10;
const STALE_THRESHOLD_MINUTES = 2 * 24 * 60;

export class GetSLOHealth {
  constructor(
    private scopedClusterClient: IScopedClusterClient,
    private repository: SLORepository
  ) {}

  public async execute(params: FetchSLOHealthParams): Promise<FetchSLOHealthResponse> {
    const sloIds = uniq(map(params.list, 'sloId'));
    const definitions = await this.repository.findAllByIds(sloIds);
    const definitionById = keyBy(definitions, 'id');

    const list = params.list
      .filter((item) => !!definitionById[item.sloId])
      .map((item) => ({
        id: item.sloId,
        instanceId: item.sloInstanceId,
        revision: definitionById[item.sloId].revision,
        name: definitionById[item.sloId].name,
      }));

    const [summaryDocsById, transformStatsById] = await Promise.all([
      this.getSummaryDocsById(list),
      this.getTransformStats(definitions),
    ]);

    const results = list.map((item) => {
      const health = computeHealth(transformStatsById, item);
      const state = computeState(summaryDocsById, item);

      return {
        sloId: item.id,
        sloName: item.name,
        sloInstanceId: item.instanceId,
        sloRevision: item.revision,
        state,
        health,
      };
    });

    return fetchSLOHealthResponseSchema.encode(results);
  }

  private async getSummaryDocsById(
    list: Array<{ id: string; instanceId: string; revision: number }>
  ) {
    const summaryDocs = await this.scopedClusterClient.asCurrentUser.search<EsSummaryDocument>({
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      query: {
        bool: {
          should: list.map((item) => ({
            bool: {
              must: [
                { term: { 'slo.id': item.id } },
                { term: { 'slo.instanceId': item.instanceId } },
                { term: { 'slo.revision': item.revision } },
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
    definitions: SLODefinition[]
  ): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
    const stats = await this.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
      {
        transform_id: definitions.map((definition) =>
          getWildcardTransformId(definition.id, definition.revision)
        ),
        allow_no_match: true,
        size: definitions.length * 2,
      },
      { ignore: [404] }
    );

    return keyBy(stats.transforms, (transform) => transform.id);
  }
}

function buildSummaryKey(id: string, instanceId: string) {
  return id + '|' + instanceId;
}

function computeState(
  summaryDocsById: Dictionary<EsSummaryDocument[]>,
  item: { id: string; instanceId: string; revision: number }
): State {
  const sloSummaryDocs = summaryDocsById[buildSummaryKey(item.id, item.instanceId)];

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
  item: { id: string; instanceId: string; revision: number }
): { overall: 'healthy' | 'unhealthy'; rollup: HealthStatus; summary: HealthStatus } {
  const rollup = getTransformHealth(transformStatsById[getSLOTransformId(item.id, item.revision)]);
  const summary = getTransformHealth(
    transformStatsById[getSLOSummaryTransformId(item.id, item.revision)]
  );

  const overall: 'healthy' | 'unhealthy' =
    rollup.status === 'healthy' && summary.status === 'healthy' ? 'healthy' : 'unhealthy';

  return { overall, rollup, summary };
}
