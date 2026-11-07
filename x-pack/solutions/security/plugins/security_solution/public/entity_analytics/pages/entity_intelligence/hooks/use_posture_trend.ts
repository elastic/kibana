/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { getRiskScoreTimeSeriesIndex } from '../../../../../common/entity_analytics/risk_engine/indices';
import { useKibana } from '../../../../common/lib/kibana';
import type { RiskLevel } from '../common';
import type { EntityLevelStat, EntityStoreStats } from './use_entity_store_stats';

/**
 * Entity types whose risk fields live under a dedicated ECS prefix in the
 * risk-score time-series index (`<type>.risk.*`). The current-snapshot posture
 * only spans user/host/service, so the prior window is aggregated the same way
 * to stay directly comparable.
 */
const TREND_ENTITY_TYPES = ['user', 'host', 'service'] as const;
type TrendEntityType = (typeof TREND_ENTITY_TYPES)[number];

/**
 * How far back the prior comparison point is taken, and how wide the window
 * around it is. A window (rather than an instant) tolerates irregular risk
 * engine run cadence while still reading a single point-in-time score per
 * entity (the latest run inside the window).
 */
const TREND_LOOKBACK_DAYS = 7;
const TREND_WINDOW_HALF_WIDTH_MS = 24 * 60 * 60 * 1000; // ±1 day around the lookback point.

const isRiskLevel = (value: unknown): value is RiskLevel =>
  value === 'Unknown' ||
  value === 'Low' ||
  value === 'Moderate' ||
  value === 'High' ||
  value === 'Critical';

interface TopMetricsBucket {
  key: string;
  latest_score?: { top?: Array<{ metrics?: Record<string, number | null> }> };
  latest_level?: { top?: Array<{ metrics?: Record<string, string | null> }> };
}

interface PriorWindowAggregations {
  aggregations?: Record<TrendEntityType, { buckets?: TopMetricsBucket[] }>;
}

/**
 * Reduces the per-type "latest score/level per entity in the prior window"
 * aggregation into the exact {@link EntityStoreStats} shape the current
 * snapshot uses, so {@link calculatePostureTrend} can diff like for like. Pure
 * and unit-tested: it only reshapes an already-fetched aggregation, and it
 * fabricates nothing — a type with no scored entities in the window simply
 * contributes no rows.
 */
export const shapePriorWindowStats = (
  aggregations: PriorWindowAggregations['aggregations'] | undefined
): EntityStoreStats | undefined => {
  if (!aggregations) return undefined;

  const byLevel: EntityLevelStat[] = [];
  let anyScored = false;

  for (const type of TREND_ENTITY_TYPES) {
    const buckets = aggregations[type]?.buckets ?? [];
    // Accumulate per-level sums so we can emit one row per (type, level) with a
    // real average, matching the current snapshot's per-level shape.
    const perLevel = new Map<RiskLevel, { count: number; scoreSum: number; scoredCount: number }>();

    for (const bucket of buckets) {
      const score = bucket.latest_score?.top?.[0]?.metrics?.[`${type}.risk.calculated_score_norm`];
      const rawLevel = bucket.latest_level?.top?.[0]?.metrics?.[`${type}.risk.calculated_level`];
      if (isRiskLevel(rawLevel)) {
        const entry = perLevel.get(rawLevel) ?? { count: 0, scoreSum: 0, scoredCount: 0 };
        entry.count += 1;
        if (typeof score === 'number') {
          entry.scoreSum += score;
          entry.scoredCount += 1;
          anyScored = true;
        }
        perLevel.set(rawLevel, entry);
      }
    }

    for (const [level, entry] of perLevel) {
      byLevel.push({
        type,
        level,
        count: entry.count,
        avgRisk: entry.scoredCount > 0 ? entry.scoreSum / entry.scoredCount : undefined,
      });
    }
  }

  // A window that scored no entities is not a comparable baseline; signal that
  // by returning undefined so the trend stays honestly unavailable.
  if (!anyScored) return undefined;

  const countForLevel = (target: RiskLevel) =>
    byLevel.filter((entry) => entry.level === target).reduce((sum, entry) => sum + entry.count, 0);

  return {
    totalEntities: byLevel.reduce((sum, entry) => sum + entry.count, 0),
    byType: [],
    byLevel,
    criticalCount: countForLevel('Critical'),
    highCount: countForLevel('High'),
  };
};

const buildPriorWindowAgg = (type: TrendEntityType) => ({
  terms: { field: `${type}.risk.id_value`, size: 10000 },
  aggs: {
    latest_score: {
      top_metrics: {
        metrics: [{ field: `${type}.risk.calculated_score_norm` }],
        sort: [{ '@timestamp': 'desc' }],
      },
    },
    latest_level: {
      top_metrics: {
        metrics: [{ field: `${type}.risk.calculated_level` }],
        sort: [{ '@timestamp': 'desc' }],
      },
    },
  },
});

export interface PostureTrendResult {
  /**
   * Prior-window snapshot in {@link EntityStoreStats} shape, or `undefined` when
   * the risk-score history index is absent/empty or scored nothing in the
   * window — in which case the trend stays unavailable rather than fabricated.
   */
  previousStats: EntityStoreStats | undefined;
  /** Number of days back the comparison point sits (drives the "N days ago" label). */
  lookbackDays: number;
  /** ISO timestamp of the comparison point, for the source/window tooltip. */
  comparedToIso: string;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches the posture inputs at a prior window (~{@link TREND_LOOKBACK_DAYS}
 * days ago) from the risk engine's time-series index
 * (`risk-score.risk-score-<space>`), taking the latest score/level per entity
 * inside the window and reshaping it into the same per-type/per-level shape as
 * the current snapshot so the two are directly comparable.
 *
 * The index is hidden and may be absent (risk engine never ran / history
 * disabled) or empty; both cases resolve to `previousStats: undefined` so the
 * hero renders the honest "Trend unavailable" state — no baseline is invented.
 */
export const usePostureTrend = (spaceId: string | undefined): PostureTrendResult => {
  const { data } = useKibana().services;
  const index = spaceId ? getRiskScoreTimeSeriesIndex(spaceId) : undefined;

  const { center, gte, lte } = useMemo(() => {
    const centerMs = Date.now() - TREND_LOOKBACK_DAYS * TREND_WINDOW_HALF_WIDTH_MS;
    return {
      center: centerMs,
      gte: new Date(centerMs - TREND_WINDOW_HALF_WIDTH_MS).toISOString(),
      lte: new Date(centerMs + TREND_WINDOW_HALF_WIDTH_MS).toISOString(),
    };
  }, []);

  const {
    data: previousStats,
    isLoading,
    isError,
  } = useQuery<EntityStoreStats | undefined>(
    ['entityIntelligencePostureTrend', index, gte, lte],
    async ({ signal }) => {
      if (!index) return undefined;
      try {
        const response = await lastValueFrom(
          data.search.search<
            { params: Record<string, unknown> },
            IKibanaSearchResponse<PriorWindowAggregations>
          >(
            {
              params: {
                index,
                // The risk-score data stream is hidden; naming it explicitly
                // (not via wildcard) keeps it visible, and allow_no_indices
                // tolerates its absence when the engine never ran.
                allow_no_indices: true,
                size: 0,
                query: { range: { '@timestamp': { gte, lte } } },
                aggs: {
                  user: buildPriorWindowAgg('user'),
                  host: buildPriorWindowAgg('host'),
                  service: buildPriorWindowAgg('service'),
                },
              },
            },
            { abortSignal: signal }
          )
        );
        return shapePriorWindowStats(response.rawResponse.aggregations);
      } catch {
        // Missing index / no read privileges: keep the trend unavailable.
        return undefined;
      }
    },
    {
      enabled: !!index,
      retry: false,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  const comparedToIso = useMemo(() => new Date(center).toISOString(), [center]);

  return {
    previousStats: previousStats ?? undefined,
    lookbackDays: TREND_LOOKBACK_DAYS,
    comparedToIso,
    isLoading,
    isError,
  };
};
