/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type {
  BriefGlance,
  GlanceStat,
  NeedsAttentionTileSnapshot,
  SourceStatus,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { MAX_EXPOSURE_LEADERS } from '../../../../../common/entity_analytics/executive_brief/constants';
import type { SnapshotContext, SnapshotPart, SnapshotSources } from './context';
import { runSource } from './context';
import { statusFromError } from './glance/esql';
import { getExposureLeaders, getPosture, type Posture } from './glance/posture';
import {
  getTileSnapshot,
  SNAPSHOT_TILE_IDS,
  type SnapshotTileId,
  type TileResult,
} from './glance/needs_attention_snapshot';

export interface GlanceResult {
  glance: BriefGlance;
  /** Golden euids of entities whose risk jumped in the window; seeds for storylines. */
  riskMoverEuids: string[];
}

const EMPTY_POSTURE: Posture = { materialRiskEntities: 0, concentration: [] };

/** Keeps the worst status of a family of sources, so a missing index outranks a plain error. */
const STATUS_SEVERITY: Record<SourceStatus, number> = {
  ok: 0,
  disabled: 1,
  missing_index: 2,
  timeout: 3,
  error: 4,
};

const worstStatus = (statuses: SourceStatus[]): SourceStatus =>
  statuses.reduce<SourceStatus>(
    (worst, status) => (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst] ? status : worst),
    'ok'
  );

/** Runs a source and, when it failed, refines `error` into `timeout` / `missing_index`. */
const runClassifiedSource = async <T>(
  name: string,
  sources: SnapshotSources,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> => {
  let thrown: unknown;
  const value = await runSource(
    name,
    sources,
    async () => {
      try {
        return await fn();
      } catch (error) {
        thrown = error;
        throw error;
      }
    },
    fallback
  );
  const entry = sources[name];
  if (entry.status === 'error' && thrown !== undefined) {
    sources[name] = { ...entry, status: statusFromError(thrown) };
  }
  return value;
};

/**
 * Builds the "At a glance" section: Needs Attention tiles (counts, previous period, trend, capped
 * sample), posture stats, risk concentration and exposure leaders. All windows are pinned to
 * `ctx.timeRange.to`. Every euid returned is registered in the evidence registry: exposure leaders
 * first, then the tile samples in tile order.
 */
export const buildGlance = async (ctx: SnapshotContext): Promise<SnapshotPart<GlanceResult>> => {
  const sources: SnapshotSources = {};

  const latestIndex = await runClassifiedSource(
    'entityStoreIndex',
    sources,
    () => resolveLatestEntitiesIndexName(ctx.esClient, ctx.spaceId),
    undefined
  );

  const [posture, leaders, tileResults] = await Promise.all([
    latestIndex
      ? runClassifiedSource('posture', sources, () => getPosture(ctx, latestIndex), EMPTY_POSTURE)
      : Promise.resolve(EMPTY_POSTURE),
    latestIndex
      ? runClassifiedSource(
          'exposureLeaders',
          sources,
          () => getExposureLeaders(ctx, latestIndex),
          [] as string[]
        )
      : Promise.resolve([] as string[]),
    Promise.all(
      SNAPSHOT_TILE_IDS.map(async (id): Promise<TileResult | undefined> => {
        if (!latestIndex) return undefined;
        return getTileSnapshot(ctx, id, latestIndex);
      })
    ),
  ]);

  const tileSources: SnapshotSources = {};
  const tiles: NeedsAttentionTileSnapshot[] = [];
  const fullSamples = new Map<SnapshotTileId, string[]>();
  SNAPSHOT_TILE_IDS.forEach((id, i) => {
    const result = tileResults[i];
    const tile: NeedsAttentionTileSnapshot = result?.tile ?? {
      id,
      status: 'error',
      count: 0,
      sample: [],
      sampleTruncated: false,
    };
    tiles.push(tile);
    fullSamples.set(id, result?.fullSample ?? []);
    tileSources[`needsAttention.${id}`] = {
      status: tile.status,
      tookMs: result?.tookMs ?? 0,
      ...(result?.message ? { message: result.message } : {}),
    };
  });
  tileSources.needsAttention = {
    status: worstStatus(tiles.map(({ status }) => status)),
    tookMs: Math.max(0, ...tileResults.map((result) => result?.tookMs ?? 0)),
  };
  Object.assign(sources, tileSources);

  const okTiles = tiles.filter(({ status }) => status === 'ok');
  const stats: GlanceStat[] = [];
  if (sources.posture?.status === 'ok') {
    if (posture.postureScore !== undefined) {
      stats.push({ id: 'postureScore', value: posture.postureScore, upIsBad: true });
    }
    stats.push({ id: 'materialRiskEntities', value: posture.materialRiskEntities, upIsBad: true });
  }
  if (okTiles.length > 0) {
    const value = okTiles.reduce((sum, { count }) => sum + count, 0);
    const hasAllPrevious = okTiles.every(({ previousCount }) => previousCount !== undefined);
    const previous = hasAllPrevious
      ? okTiles.reduce((sum, { previousCount }) => sum + (previousCount ?? 0), 0)
      : undefined;
    stats.push({
      id: 'activeSignals',
      value,
      ...(previous !== undefined ? { previous, delta: value - previous } : {}),
      upIsBad: true,
    });
  }

  const exposureLeaders = leaders.slice(0, MAX_EXPOSURE_LEADERS);
  const riskMoverEuids = fullSamples.get('riskMovers') ?? [];

  // Deterministic registration order: leaders, then tile samples, then the wider risk mover list.
  exposureLeaders.forEach((euid) => ctx.registry.entity(euid));
  tiles.forEach((tile) => tile.sample.forEach((euid) => ctx.registry.entity(euid)));
  riskMoverEuids.forEach((euid) => ctx.registry.entity(euid));

  return {
    value: {
      glance: {
        stats,
        needsAttention: tiles,
        concentration: posture.concentration,
        exposureLeaders,
      },
      riskMoverEuids,
    },
    sources,
  };
};
