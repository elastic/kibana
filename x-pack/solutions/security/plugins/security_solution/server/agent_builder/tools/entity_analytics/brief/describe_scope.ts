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

/** What membership of each tile means for an entity, following the tile descriptions on the page. */
export const BRIEF_TILE_DEFINITIONS: Record<BriefTileId, (period: string) => string> = {
  entitiesWithAlerts: (period) => `had at least one alert in the last ${period}`,
  entitiesWithAnomalies: (period) => `had at least one ML anomaly in the last ${period}`,
  riskMovers: (period) => `risk score rose by 10 or more points against the previous ${period}`,
  newlyHighCritical: (period) => `crossed into High or Critical risk in the last ${period}`,
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

/** A tile's change against the previous period, in words. */
export const describeTileChange = (tile: EntityAnalyticsScopeTile, period: string): string => {
  if (tile.unavailable) {
    return 'unavailable';
  }
  if (tile.delta === undefined) {
    return 'no comparison';
  }
  if (tile.delta === 0) {
    return `no change vs previous ${period}`;
  }
  return `${tile.delta > 0 ? '+' : ''}${tile.delta} vs previous ${period}`;
};
