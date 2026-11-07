/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityRow, EvidenceKind, TrendWindow, TriageTileKey } from './types';
import { isNewIn, tilePopulation, WINDOW_MS } from './entities_logic';
import { hasEvidence } from './evidence';

/**
 * Direction semantics for a tile's delta coloring:
 *  - `up-bad`: an increase is bad (red on ▲), e.g. more high-risk entities.
 *  - `up-good`: an increase is good (green on ▲).
 *  - `neutral`: informational, always muted.
 */
export type TileDirection = 'up-bad' | 'up-good' | 'neutral';

/** A single KPI tile model, fully derived from real data. */
export interface KpiTile {
  /** Stable key for the tile. */
  key: string;
  /** Triage filter key when this tile filters the table (attention tiles only). */
  filterKey: TriageTileKey | null;
  /** Current value. */
  value: number | undefined;
  /**
   * Change vs the prior comparable window, or `undefined` when the historical
   * signal is genuinely unavailable (tile then renders no delta — never faked).
   */
  delta: number | undefined;
  direction: TileDirection;
  /** Optional real series for the sparkline (expanded size only). */
  series?: number[];
  /** Whether this tile belongs to the "attention" (true) or "pulse" (false) group. */
  attention: boolean;
}

/**
 * Attention (triage) tiles: small, actionable populations computed directly
 * from the enriched rows. Faithfully ports the mock's attention tiles, but
 * every value is a real count over the current entity set.
 */
export const buildAttentionTiles = (
  rows: EntityRow[],
  win: TrendWindow,
  now: number,
  prevRows?: EntityRow[]
): KpiTile[] => {
  const keys: TriageTileKey[] = [
    'highrisk',
    'untriaged',
    'firsthigh',
    'newrule',
    'newalerted',
    'watchlisted',
  ];
  return keys.map((key) => {
    const sourceByTile: Partial<Record<TriageTileKey, EvidenceKind>> = {
      untriaged: 'cases',
      firsthigh: 'riskHistory',
      newrule: 'alerts',
      newalerted: 'alerts',
      watchlisted: 'watchlists',
    };
    const source = sourceByTile[key];
    const isComplete = !source || rows.every((row) => hasEvidence(row, source));
    const value = isComplete ? tilePopulation(key, rows, win, now) : undefined;
    // A prior-window population is only available when we were handed a prior
    // snapshot; otherwise the delta stays honestly unavailable.
    const delta =
      value === undefined ||
      prevRows === undefined ||
      (source && prevRows.some((row) => !hasEvidence(row, source)))
        ? undefined
        : value - tilePopulation(key, prevRows, win, now);
    return {
      key,
      filterKey: key,
      value,
      delta,
      direction: key === 'watchlisted' ? 'neutral' : 'up-bad',
      attention: true,
    };
  });
};

/**
 * Environment-pulse (context) tiles: org-scale counts. Derived from real data:
 *  - New entities: first seen within the window.
 *  - Entities with alerts / anomalies: rows carrying ≥1 alert / anomaly.
 *  - Daily active: distinct entities observed per day (from a real series when
 *    supplied; otherwise the value is unavailable).
 */
export const buildPulseTiles = (
  rows: EntityRow[],
  win: TrendWindow,
  now: number,
  dailyActiveSeries: number[] | undefined
): KpiTile[] => {
  const newEntities = rows.filter((row) => isNewIn(row, win, now)).length;
  const withAlerts = rows.every((row) => hasEvidence(row, 'alerts'))
    ? rows.filter((row) => row.alerts > 0).length
    : undefined;
  const withAnoms = rows.every((row) => hasEvidence(row, 'anomalies'))
    ? rows.filter((row) => row.anoms > 0).length
    : undefined;

  const series = dailyActiveSeries && dailyActiveSeries.length >= 2 ? dailyActiveSeries : undefined;
  const dailyActiveValue = series ? series[series.length - 1] : undefined;
  const dailyActiveDelta =
    series && series.length >= 2
      ? series[series.length - 1] - series[series.length - 2]
      : undefined;

  return [
    {
      key: 'new-entities',
      filterKey: null,
      value: newEntities,
      delta: undefined,
      direction: 'neutral',
      attention: false,
    },
    {
      key: 'entities-with-alerts',
      filterKey: null,
      value: withAlerts,
      delta: undefined,
      direction: 'up-bad',
      attention: false,
    },
    {
      key: 'entities-with-anomalies',
      filterKey: null,
      value: withAnoms,
      delta: undefined,
      direction: 'up-bad',
      attention: false,
    },
    {
      key: 'daily-active',
      filterKey: null,
      value: dailyActiveValue,
      delta: dailyActiveDelta,
      direction: 'neutral',
      series,
      attention: false,
    },
  ];
};

/**
 * Builds a real daily-active series from per-day distinct-entity counts within
 * the window. `perDayCounts` is expected oldest→newest. Returns undefined when
 * there is not enough data to plot honestly.
 */
export const dailyActiveSeriesFromCounts = (perDayCounts: number[]): number[] | undefined =>
  perDayCounts.length >= 2 ? perDayCounts : undefined;

/** Number of days spanned by a trend window (for labeling). */
export const windowDays = (win: TrendWindow): number => Math.round(WINDOW_MS[win] / 86_400_000);
