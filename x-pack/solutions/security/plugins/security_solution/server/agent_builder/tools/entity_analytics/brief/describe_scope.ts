/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import type {
  BriefPeriod,
  BriefTileId,
  EntityAnalyticsScope,
  EntityAnalyticsScopeTile,
} from '../../../../../common/entity_analytics/ai_brief/scope';

/** The tile titles as the page shows them. */
export const BRIEF_TILE_TITLES: Record<BriefTileId, string> = {
  entitiesWithAlerts: 'Entities with alerts',
  entitiesWithAnomalies: 'Entities with anomalies',
  riskMovers: 'Risk movers',
  newlyHighCritical: 'Newly high/critical',
  watchlisted: 'Watchlisted',
  newEntity: 'New entity',
};

/** What membership of each tile means for an entity, following the tile queries on the page. */
export const BRIEF_TILE_DEFINITIONS: Record<BriefTileId, (period: string) => string> = {
  // The tile counts only High and Critical alerts, of any status, whatever the page's description says.
  entitiesWithAlerts: (period) =>
    `had at least one High or Critical alert, open or closed, in the last ${period}`,
  entitiesWithAnomalies: (period) => `had at least one ML anomaly in the last ${period}`,
  riskMovers: (period) =>
    `risk score is at least 10 points higher than at the start of the last ${period}`,
  newlyHighCritical: (period) =>
    `is High or Critical now, and was lower or not yet scored at the start of the last ${period}`,
  watchlisted: (period) => `is on a watchlist and had at least one alert in the last ${period}`,
  newEntity: (period) => `was first seen in the last ${period} with a risk score above zero`,
};

/** The periods in words. */
export const BRIEF_PERIOD_LABELS: Record<BriefPeriod, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

const HOUR_MS = 3_600_000;
const PERIOD_MS: Record<BriefPeriod, number> = {
  '24h': 24 * HOUR_MS,
  '7d': 7 * 24 * HOUR_MS,
  '30d': 30 * 24 * HOUR_MS,
};

/** The start of the captured period, which ends at `capturedAt`. */
export const getPeriodStart = ({ capturedAt, period }: EntityAnalyticsScope): Date =>
  new Date(new Date(capturedAt).getTime() - PERIOD_MS[period]);

/** A time in minutes, in UTC. */
export const formatBriefTime = (time: Date | string): string =>
  `${new Date(time).toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** The scope's filter pills. The scope validates them as objects with `meta`; they are Kibana filters. */
export const getScopeFilters = ({ filters }: EntityAnalyticsScope): Filter[] =>
  (filters ?? []) as Filter[];

/** A short label for a filter pill. */
export const filterLabel = ({ meta }: Filter): string => {
  if (meta.alias) {
    return meta.alias;
  }
  const label = `${meta.negate ? 'NOT ' : ''}${meta.key ?? 'custom filter'}`;
  const value = filterValue(meta.params, meta.value);
  return value ? `${label}: ${value}` : label;
};

const filterValue = (params: unknown, value: unknown): string | undefined => {
  if (Array.isArray(params)) {
    return params.join(', ');
  }
  if (params && typeof params === 'object' && 'query' in params) {
    return String(params.query);
  }
  return value === undefined ? undefined : String(value);
};

/** A count as the page shows it, with thousands separators. */
export const formatCount = (count: number): string => count.toLocaleString('en-US');

/** A count with its noun, singular for one. */
export const formatCountOf = (count: number, one: string, many: string): string =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

/** True when the tile compares against a previous value of 0, which may be missing history. */
export const hasNoPreviousValue = ({ value, delta }: EntityAnalyticsScopeTile): boolean =>
  value > 0 && delta === value;

/** A tile's change against the previous period, in words. */
export const describeTileChange = (tile: EntityAnalyticsScopeTile, period: BriefPeriod): string => {
  const { delta, unavailable } = tile;
  const previous = `previous ${BRIEF_PERIOD_LABELS[period]}`;
  if (unavailable) {
    return 'unavailable';
  }
  if (delta === undefined) {
    return 'no comparison';
  }
  if (hasNoPreviousValue(tile)) {
    return `none in the ${previous}`;
  }
  if (delta === 0) {
    return `no change vs ${previous}`;
  }
  return `${delta > 0 ? '+' : ''}${formatCount(delta)} vs ${previous}`;
};

/**
 * How many tile entities the facts cover. The total is the largest tile or the distinct captured
 * ids, whichever is larger, and a lower bound when a tile sent fewer ids than its value. Never a sum.
 */
export const describeCoverage = (
  { tiles }: EntityAnalyticsScope,
  checkedCount: number,
  capturedCount: number
): string => {
  const available = Object.values(tiles).filter(({ unavailable }) => !unavailable);
  const isSampled = available.some(({ value, entityIds }) => entityIds.length < value);
  const total = Math.max(capturedCount, ...available.map(({ value }) => value));
  if (!isSampled && checkedCount >= total) {
    return `${formatCountOf(checkedCount, 'entity', 'entities')} in the page's tiles`;
  }
  return `${formatCount(checkedCount)} of ${isSampled ? 'at least ' : ''}${formatCountOf(
    total,
    'entity',
    'entities'
  )} in the page's tiles, chosen by selected tile, tile count, then risk`;
};
