/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { TransformGetTransformStatsTransformStats } from 'elasticsearch-8.x/lib/api/types';
import { groupBy, keyBy, type Dictionary } from 'lodash';
import moment from 'moment';
import {
  SUMMARY_DESTINATION_INDEX_PATTERN,
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardTransformId,
} from '../../../common/constants';
import type { EsSummaryDocument } from '../../services/summary_transform_generator/helpers/create_temp_summary';
import type { HealthStatus, State, TransformHealth } from '../models/health';

interface Item {
  id: string;
  instanceId?: string;
  revision: number;
  name: string;
  enabled: boolean;
}

interface Dependencies {
  scopedClusterClient: IScopedClusterClient;
}

export interface SLOHealth {
  sloId: string;
  sloInstanceId: string;
  sloRevision: number;
  sloName: string;
  state: State;
  health: {
    overall: HealthStatus;
    rollup: TransformHealth;
    summary: TransformHealth;
  };
}

const LAG_THRESHOLD_MINUTES = 10;
const STALE_THRESHOLD_MINUTES = 2 * 24 * 60;

export async function computeHealth(list: Item[], deps: Dependencies): Promise<SLOHealth[]> {
  const [summaryDocsById, transformStatsById] = await Promise.all([
    getSummaryDocsById(list, deps),
    getTransformStatsById(list, deps),
  ]);

  return list.map((item) => {
    const health = computeTransformsHealth(transformStatsById, item);
    const state = computeTransformState(summaryDocsById, item);

    return {
      sloId: item.id,
      sloName: item.name,
      sloInstanceId: item.instanceId ?? ALL_VALUE,
      sloRevision: item.revision,
      state,
      health,
    };
  });
}

async function getSummaryDocsById(list: Item[], deps: Dependencies) {
  const summaryDocs = await deps.scopedClusterClient.asCurrentUser.search<EsSummaryDocument>({
    index: SUMMARY_DESTINATION_INDEX_PATTERN,
    query: {
      bool: {
        should: list.map((item) => ({
          bool: {
            must: [
              { term: { 'slo.id': item.id } },
              { term: { 'slo.instanceId': item.instanceId ?? ALL_VALUE } },
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

async function getTransformStatsById(
  list: Item[],
  deps: Dependencies
): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
  const stats = await deps.scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
    {
      transform_id: list.map((item) => getWildcardTransformId(item.id, item.revision)),
      allow_no_match: true,
      size: list.length * 2,
    },
    { ignore: [404] }
  );

  return keyBy(stats.transforms, (transform) => transform.id);
}

function computeTransformState(
  summaryDocsById: Dictionary<EsSummaryDocument[]>,
  item: Item
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
): TransformHealth {
  if (!transformStat) {
    return {
      status: 'missing',
      state: 'unavailable',
    };
  }

  const transformStatus = transformStat.health?.status?.toLowerCase();
  const transformState = transformStat.state?.toLowerCase();

  return {
    status: transformStatus === 'green' ? 'healthy' : 'unhealthy',
    state:
      transformState === 'started'
        ? 'started'
        : transformState === 'stopped'
        ? 'stopped'
        : 'unavailable',
  };
}

function computeTransformsHealth(
  transformStatsById: Dictionary<TransformGetTransformStatsTransformStats>,
  item: Item
): { overall: HealthStatus; rollup: TransformHealth; summary: TransformHealth } {
  const rollup = getTransformHealth(transformStatsById[getSLOTransformId(item.id, item.revision)]);
  const summary = getTransformHealth(
    transformStatsById[getSLOSummaryTransformId(item.id, item.revision)]
  );

  const rollupStateMatchesSloEnabled =
    (item.enabled && rollup.state === 'started') || (!item.enabled && rollup.state === 'stopped');
  const summaryStateMatchesSloEnabled =
    (item.enabled && rollup.state === 'started') || (!item.enabled && rollup.state === 'stopped');

  const overall: HealthStatus =
    rollup.status === 'healthy' &&
    rollupStateMatchesSloEnabled &&
    summary.status === 'healthy' &&
    summaryStateMatchesSloEnabled
      ? 'healthy'
      : 'unhealthy';

  return { overall, rollup, summary };
}

function buildSummaryKey(id: string, instanceId: string = ALL_VALUE) {
  return id + '|' + instanceId;
}
