/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  BriefTimeRangeKey,
  NeedsAttentionCardId,
  NeedsAttentionTileSnapshot,
} from '../../../../../common/entity_analytics/executive_brief/types';

export const MAX_TREND_CHANGES = 3;

/** [singular, plural] label per tile. */
const TILE_LABELS: Record<NeedsAttentionCardId, readonly [string, string]> = {
  entitiesWithAlerts: ['entity with alerts', 'entities with alerts'],
  riskMovers: ['entity with rising risk', 'entities with rising risk'],
  newlyHighCritical: ['newly high/critical entity', 'newly high/critical entities'],
  entitiesWithAnomalies: ['entity with anomalies', 'entities with anomalies'],
  watchlisted: ['watchlisted entity with alerts', 'watchlisted entities with alerts'],
  newEntity: ['new entity', 'new entities'],
};

const RANGE_LABELS: Record<BriefTimeRangeKey, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

export interface TrendChange {
  id: NeedsAttentionCardId;
  delta: number;
  text: string;
}

export interface TrendSummary {
  /** e.g. "vs previous 7 days". */
  prefix: string;
  changes: TrendChange[];
}

/** Up to three of the largest period-over-period changes; undefined when there is nothing to say. */
export const buildTrendSummary = (
  tiles: readonly NeedsAttentionTileSnapshot[] | undefined,
  range: BriefTimeRangeKey
): TrendSummary | undefined => {
  const changes = (tiles ?? [])
    .map((tile, order) => ({ tile, order }))
    .filter(
      ({ tile }) =>
        tile.status === 'ok' &&
        tile.previousCount !== undefined &&
        tile.count !== tile.previousCount
    )
    .map(({ tile, order }) => ({
      order,
      id: tile.id,
      delta: tile.count - (tile.previousCount ?? tile.count),
      count: tile.count,
      previous: tile.previousCount ?? tile.count,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.order - b.order)
    .slice(0, MAX_TREND_CHANGES)
    .map(({ id, delta, count, previous }): TrendChange => {
      const size = Math.abs(delta);
      const arrow = delta > 0 ? '▲' : '▼';
      const direction = delta > 0 ? 'more' : 'fewer';
      return {
        id,
        delta,
        text: `${arrow} ${size} ${direction} ${
          TILE_LABELS[id][size === 1 ? 0 : 1]
        } (${previous} → ${count})`,
      };
    });
  if (changes.length === 0) return undefined;
  return { prefix: `vs previous ${RANGE_LABELS[range]}`, changes };
};

/** Single-line form for exports: "vs previous 7 days: ▲ 6 more … · ▼ 3 fewer …". */
export const formatTrendSummary = (summary: TrendSummary): string =>
  `${summary.prefix}: ${summary.changes.map(({ text }) => text).join(' · ')}`;
