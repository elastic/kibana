/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type {
  NeedsAttentionCardId,
  NeedsAttentionTileSnapshot,
  SourceStatus,
  TimePoint,
} from '../../../../../../common/entity_analytics/executive_brief/types';
import {
  MAX_SEEDS_PER_KIND,
  MAX_TILE_SAMPLE,
} from '../../../../../../common/entity_analytics/executive_brief/constants';
import {
  alertsPrevWindow,
  buildAlertBasedTilesQuery,
  buildAlertBasedTilesTrailingSeriesQuery,
  buildNewlyHighCriticalCountQuery,
  buildNewlyHighCriticalTrailingSeriesQuery,
  buildRiskMoversCountQuery,
  buildRiskMoversTrailingSeriesQuery,
  getDeltaPercentage,
  newlyHighCriticalPrevWindow,
  parseAlertBasedTilesResponse,
  parseAlertBasedTilesTrend,
  pinQueryNow,
  riskMoversPrevWindow,
  TRAILING_WINDOW,
  type TimeRange,
} from '../../../../../../common/entity_analytics/needs_attention';
import { parseTrailingDots } from '../../../../../../common/entity_analytics/needs_attention/tile_trailing_dots';
import { trailingRiskMoversColumn } from '../../../../../../common/entity_analytics/needs_attention/tile_risk_movers_trailing_series_query';
import {
  trailingBoundaryRowsColumn,
  trailingNewlyHighCriticalColumn,
} from '../../../../../../common/entity_analytics/needs_attention/tile_newly_high_critical_trailing_series_query';
import type { SnapshotContext } from '../context';
import { runEsql, statusFromError } from './esql';

export type SnapshotTileId = Extract<
  NeedsAttentionCardId,
  'entitiesWithAlerts' | 'riskMovers' | 'newlyHighCritical'
>;

/** Tile order is part of the contract: it fixes evidence-id numbering. */
export const SNAPSHOT_TILE_IDS: readonly SnapshotTileId[] = [
  'entitiesWithAlerts',
  'riskMovers',
  'newlyHighCritical',
];

/** Risk movers also seed storylines, so its sample is fetched wider than the tile sample. */
const RISK_MOVERS_SAMPLE_LIMIT = Math.max(MAX_TILE_SAMPLE, MAX_SEEDS_PER_KIND);

interface SeriesDots {
  /** One value per dot, oldest first. */
  values: number[];
  /** Dots to keep, same length as `values`; absent keeps all. */
  keep?: boolean[];
}

interface TileQueries {
  count: string;
  previous: string;
  sample: string;
  series: string;
  sampleLimit: number;
  parseCount: (raw: ESQLSearchResponse) => number;
  parseSeries: (raw: ESQLSearchResponse, range: TimeRange) => SeriesDots;
}

const readValue = (raw: ESQLSearchResponse): number => {
  const index = raw.columns?.findIndex((c) => c.name === 'value') ?? -1;
  const value = index < 0 ? undefined : raw.values?.[0]?.[index];
  return typeof value === 'number' ? value : 0;
};

const readEffectiveIds = (raw: ESQLSearchResponse): string[] => {
  const index = raw.columns?.findIndex((c) => c.name === 'effective_id') ?? -1;
  if (index < 0) return [];
  return (raw.values ?? [])
    .map((row) => row[index])
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
};

/** Newly H/C dots whose boundary lies before the oldest score are artefacts; they are dropped (time is kept). */
const parseNewlyHighCriticalSeries = (raw: ESQLSearchResponse, range: TimeRange): SeriesDots => {
  const values = parseTrailingDots(raw, range, trailingNewlyHighCriticalColumn);
  const boundaryRows = parseTrailingDots(raw, range, trailingBoundaryRowsColumn);
  return { values, keep: boundaryRows.map((rows) => rows > 0) };
};

const buildTileQueries = (
  tileId: SnapshotTileId,
  latestIndex: string,
  spaceId: string,
  range: TimeRange
): TileQueries => {
  switch (tileId) {
    case 'entitiesWithAlerts':
      return {
        count: buildAlertBasedTilesQuery(euid, latestIndex, spaceId, undefined, [], {
          includeIds: false,
        }),
        previous: buildAlertBasedTilesQuery(
          euid,
          latestIndex,
          spaceId,
          alertsPrevWindow(range),
          [],
          { includeIds: false }
        ),
        sample: buildAlertBasedTilesQuery(euid, latestIndex, spaceId, undefined, [], {
          sampleLimit: MAX_TILE_SAMPLE,
        }),
        series: buildAlertBasedTilesTrailingSeriesQuery(euid, latestIndex, spaceId, range, []),
        sampleLimit: MAX_TILE_SAMPLE,
        parseCount: (raw) => parseAlertBasedTilesResponse(raw).alertsCount,
        parseSeries: (raw, r) => ({ values: parseAlertBasedTilesTrend(raw, r).alerts }),
      };
    case 'riskMovers':
      return {
        count: buildRiskMoversCountQuery(spaceId, latestIndex, undefined, [], {
          includeIds: false,
        }),
        previous: buildRiskMoversCountQuery(spaceId, latestIndex, riskMoversPrevWindow(range), [], {
          includeIds: false,
        }),
        sample: buildRiskMoversCountQuery(spaceId, latestIndex, undefined, [], {
          sampleLimit: RISK_MOVERS_SAMPLE_LIMIT,
        }),
        series: buildRiskMoversTrailingSeriesQuery(spaceId, latestIndex, range, []),
        sampleLimit: RISK_MOVERS_SAMPLE_LIMIT,
        parseCount: readValue,
        parseSeries: (raw, r) => ({ values: parseTrailingDots(raw, r, trailingRiskMoversColumn) }),
      };
    case 'newlyHighCritical':
      return {
        count: buildNewlyHighCriticalCountQuery(spaceId, latestIndex, undefined, [], {
          includeIds: false,
        }),
        previous: buildNewlyHighCriticalCountQuery(
          spaceId,
          latestIndex,
          newlyHighCriticalPrevWindow(range),
          [],
          { includeIds: false }
        ),
        sample: buildNewlyHighCriticalCountQuery(spaceId, latestIndex, undefined, [], {
          sampleLimit: MAX_TILE_SAMPLE,
        }),
        series: buildNewlyHighCriticalTrailingSeriesQuery(spaceId, latestIndex, range, []),
        sampleLimit: MAX_TILE_SAMPLE,
        parseCount: readValue,
        parseSeries: parseNewlyHighCriticalSeries,
      };
  }
};

/** Oldest-first dots to `{ t, v }`; the newest dot ends at the snapshot's fixed "now". */
const toTimePoints = (
  values: number[],
  keep: boolean[] | undefined,
  range: TimeRange,
  nowIso: string
): TimePoint[] => {
  const { stepHours } = TRAILING_WINDOW[range];
  const nowMs = Date.parse(nowIso);
  return values.flatMap((v, i) =>
    keep && !keep[i]
      ? []
      : [{ t: new Date(nowMs - (values.length - 1 - i) * stepHours * 3_600_000).toISOString(), v }]
  );
};

export interface TileResult {
  tile: NeedsAttentionTileSnapshot;
  /** Extra detail for the source map, e.g. the error message. */
  message?: string;
  tookMs: number;
  /** Full ranked sample (risk movers keeps up to MAX_SEEDS_PER_KIND, the tile only the first MAX_TILE_SAMPLE). */
  fullSample: string[];
}

const failedTile = (id: SnapshotTileId, status: SourceStatus): NeedsAttentionTileSnapshot => ({
  id,
  status,
  count: 0,
  sample: [],
  sampleTruncated: false,
});

/**
 * Runs one tile: current + previous counts (no id lists), a capped ranked sample, and an optional
 * trend. A failing count makes the tile a gap; a failing previous, sample or trend only drops that part.
 */
export const getTileSnapshot = async (
  ctx: SnapshotContext,
  tileId: SnapshotTileId,
  latestIndex: string
): Promise<TileResult> => {
  const start = Date.now();
  const { range, to } = ctx.timeRange;
  const queries = buildTileQueries(tileId, latestIndex, ctx.spaceId, range);
  const run = (query: string) => runEsql(ctx.esClient, ctx.abortSignal, pinQueryNow(query, to));

  const [current, previous, sample, series] = await Promise.allSettled([
    run(queries.count),
    run(queries.previous),
    run(queries.sample),
    run(queries.series),
  ]);

  if (current.status === 'rejected') {
    return {
      tile: failedTile(tileId, statusFromError(current.reason)),
      message: current.reason instanceof Error ? current.reason.message : String(current.reason),
      tookMs: Date.now() - start,
      fullSample: [],
    };
  }

  const count = queries.parseCount(current.value);
  const previousCount =
    previous.status === 'fulfilled' ? queries.parseCount(previous.value) : undefined;
  const fullSample = sample.status === 'fulfilled' ? readEffectiveIds(sample.value) : [];

  let trend: TimePoint[] | undefined;
  if (series.status === 'fulfilled') {
    const { values, keep } = queries.parseSeries(series.value, range);
    trend = toTimePoints(values, keep, range, to);
  }

  const delta = previousCount === undefined ? undefined : count - previousCount;
  return {
    tile: {
      id: tileId,
      status: 'ok',
      count,
      previousCount,
      delta,
      deltaPct: delta === undefined ? undefined : getDeltaPercentage(delta, count),
      trend,
      sample: fullSample.slice(0, MAX_TILE_SAMPLE),
      sampleTruncated: count > Math.min(fullSample.length, MAX_TILE_SAMPLE),
    },
    message:
      previous.status === 'rejected' || sample.status === 'rejected'
        ? 'previous period or sample unavailable'
        : undefined,
    tookMs: Date.now() - start,
    fullSample,
  };
};
