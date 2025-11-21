/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformGetTransformStatsTransformStats } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import { type Dictionary, keyBy } from 'lodash';
import { getSLOSummaryTransformId, getSLOTransformId } from '../../common/constants';
import type { HealthStatus } from '../domain/models/health';

/**
 * Fetches transform statistics for both rollup and summary transforms of an SLO
 */
export async function getTransformStatsForSLO(
  scopedClusterClient: IScopedClusterClient,
  item: {
    sloId: string;
    sloRevision: number;
  }
): Promise<Dictionary<TransformGetTransformStatsTransformStats>> {
  const rollupTransformStats =
    await scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
      {
        transform_id: getSLOTransformId(item.sloId, item.sloRevision),
        allow_no_match: true,
        size: 1,
      },
      { ignore: [404] }
    );

  const summaryTransformStats =
    await scopedClusterClient.asSecondaryAuthUser.transform.getTransformStats(
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

/**
 * Computes the health status for a single transform
 */
export function getTransformHealth(
  id: string,
  sloEnabled: boolean | undefined,
  transformStat?: TransformGetTransformStatsTransformStats
): HealthStatus {
  if (!transformStat) {
    return {
      id,
      status: 'missing',
      match: false,
    };
  }

  const transformState = transformStat.state?.toLowerCase() as HealthStatus['transformState'];
  const match =
    (transformState === 'started' && sloEnabled) || (transformState === 'stopped' && !sloEnabled)
      ? true
      : false;
  const status = transformStat.health?.status?.toLowerCase() === 'green' ? 'healthy' : 'unhealthy';
  return {
    id,
    status,
    transformState,
    match,
  };
}

/**
 * Computes the overall health for both rollup and summary transforms of an SLO
 */
export function computeHealth(
  transformStatsById: Dictionary<TransformGetTransformStatsTransformStats>,
  item: { sloId: string; sloInstanceId: string; sloRevision: number; enabled?: boolean }
): {
  overall: 'healthy' | 'unhealthy';
  rollup: HealthStatus;
  summary: HealthStatus;
  enabled: boolean | undefined;
} {
  const rollupId = getSLOTransformId(item.sloId, item.sloRevision);
  const summaryId = getSLOSummaryTransformId(item.sloId, item.sloRevision);

  const rollup = getTransformHealth(rollupId, item.enabled, transformStatsById[rollupId]);
  const summary = getTransformHealth(summaryId, item.enabled, transformStatsById[summaryId]);

  const stateMatch = rollup.match && summary.match;

  const overallTransformHealth: 'healthy' | 'unhealthy' =
    rollup.status === 'healthy' && summary.status === 'healthy' ? 'healthy' : 'unhealthy';

  const overall = stateMatch ? overallTransformHealth : 'unhealthy';

  return { overall, rollup, summary, enabled: item.enabled };
}
