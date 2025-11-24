/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { ALL_VALUE } from '@kbn/slo-schema';
import type { TransformGetTransformStatsTransformStats } from 'elasticsearch-8.x/lib/api/types';
import { keyBy, type Dictionary } from 'lodash';
import {
  getSLOSummaryTransformId,
  getSLOTransformId,
  getWildcardTransformId,
} from '../../../common/constants';
import type { TransformHealth } from '../models/health';

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
  id: string;
  instanceId: string;
  revision: number;
  name: string;
  health: {
    isProblematic: boolean;
    rollup: TransformHealth;
    summary: TransformHealth;
  };
}

export async function computeHealth(list: Item[], deps: Dependencies): Promise<SLOHealth[]> {
  const transformStatsById = await getTransformStatsById(list, deps);
  return list.map((item) => {
    const health = computeItemHealth(transformStatsById, item);

    return {
      id: item.id,
      instanceId: item.instanceId ?? ALL_VALUE,
      name: item.name,
      revision: item.revision,
      health,
    };
  });
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

function computeItemHealth(
  transformStatsById: Dictionary<TransformGetTransformStatsTransformStats>,
  item: Item
): { rollup: TransformHealth; summary: TransformHealth; isProblematic: boolean } {
  const rollup = getTransformHealth(
    item,
    transformStatsById[getSLOTransformId(item.id, item.revision)]
  );
  const summary = getTransformHealth(
    item,
    transformStatsById[getSLOSummaryTransformId(item.id, item.revision)]
  );

  const isProblematic = rollup.isProblematic || summary.isProblematic;

  return { isProblematic, rollup, summary };
}

function getTransformHealth(
  item: Item,
  transformStat?: TransformGetTransformStatsTransformStats
): TransformHealth {
  if (!transformStat) {
    return {
      isProblematic: true,
      missing: true,
      status: 'unavailable',
      state: 'unavailable',
    };
  }

  const state = toTransformState(transformStat.state?.toLowerCase());
  const status = toTransformStatus(transformStat.health?.status?.toLowerCase());
  const stateMatches =
    (!item.enabled && ['stopped', 'stopping', 'aborting'].includes(state)) ||
    (item.enabled && ['started', 'indexing'].includes(state));

  const isProblematic = status === 'unhealthy' || state === 'failed' || !stateMatches;

  return {
    isProblematic,
    missing: false,
    status,
    state,
    stateMatches,
  };
}

function toTransformState(
  state: string
): 'started' | 'indexing' | 'stopped' | 'stopping' | 'failed' | 'aborting' | 'unavailable' {
  switch (state) {
    case 'started':
      return 'started';
    case 'indexing':
      return 'indexing';
    case 'stopped':
      return 'stopped';
    case 'stopping':
      return 'stopping';
    case 'failed':
      return 'failed';
    case 'aborting':
      return 'aborting';
    default:
      return 'unavailable';
  }
}

function toTransformStatus(status?: string): 'healthy' | 'unhealthy' | 'unavailable' {
  switch (status) {
    case 'green':
      return 'healthy';
    case 'red':
    case 'yellow':
      return 'unhealthy';
    default:
      return 'unavailable';
  }
}
