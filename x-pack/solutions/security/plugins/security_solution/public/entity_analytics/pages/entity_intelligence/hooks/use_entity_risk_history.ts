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
import type { RiskHistoryPoint } from '../entities/enrichment';
import { firstHighFromHistory, riskDeltasFromHistory } from '../entities/enrichment';
import type { TrendWindow } from '../entities/types';

const HISTORY_LOOKBACK = 'now-30d';
const ENTITY_BUCKET_SIZE = 3000;
const DATE_HISTOGRAM_INTERVAL = '6h';
const DAILY_INTERVAL = '1d';

interface DatePoint {
  key: number;
  avg_score?: { value: number | null };
}

interface EntityHistoryBucket {
  key: string;
  points?: { buckets: DatePoint[] };
}

interface RiskHistoryAggregations {
  by_user?: { buckets: EntityHistoryBucket[] };
  by_host?: { buckets: EntityHistoryBucket[] };
  by_service?: { buckets: EntityHistoryBucket[] };
  daily_active?: { buckets: Array<{ key: number; entities?: { value: number } }> };
}

interface RiskHistoryResponse {
  aggregations?: RiskHistoryAggregations;
}

/** Per-entity trend signal derived from the risk-score history datastream. */
export interface EntityTrendSignal {
  hasHistory: boolean;
  riskDeltas: Record<TrendWindow, number>;
  firstHighAt: number | undefined;
}

const perEntityAgg = (field: string) => ({
  terms: { field, size: ENTITY_BUCKET_SIZE },
  aggs: {
    points: {
      date_histogram: { field: '@timestamp', fixed_interval: DATE_HISTOGRAM_INTERVAL },
      aggs: {
        avg_score: {
          avg: {
            field: field.startsWith('user')
              ? 'user.risk.calculated_score_norm'
              : field.startsWith('service')
              ? 'service.risk.calculated_score_norm'
              : 'host.risk.calculated_score_norm',
          },
        },
      },
    },
  },
});

/**
 * Reads the real risk-score history datastream (`risk-score.risk-score-<space>`)
 * and derives, per entity, the risk-score trend deltas for each window and the
 * first-ever High crossing time. Also derives a real "daily active entities"
 * series (distinct entities scored per day) for the environment-pulse tile.
 *
 * The datastream keys the entity by its prefixed id in `host.name`/`user.name`
 * (e.g. `host:host-laptop-fin03`), which matches the entity store's
 * `entity.id`. When the index is absent/empty the hook degrades to empty maps
 * so deltas render flat and the first-High tile counts nothing — never faked.
 */
export const useEntityRiskHistory = (spaceId: string | undefined, now: number, enabled = true) => {
  const { data } = useKibana().services;
  const index = spaceId ? getRiskScoreTimeSeriesIndex(spaceId) : undefined;

  const {
    data: result,
    isLoading,
    isError,
  } = useQuery(
    ['entityIntelligenceEntitiesRiskHistory', index],
    async ({ signal }) => {
      if (!index) return undefined;
      try {
        const response = await lastValueFrom(
          data.search.search<
            { params: Record<string, unknown> },
            IKibanaSearchResponse<RiskHistoryResponse>
          >(
            {
              params: {
                index,
                allow_no_indices: true,
                size: 0,
                query: { range: { '@timestamp': { gte: HISTORY_LOOKBACK, lte: 'now' } } },
                aggs: {
                  by_user: perEntityAgg('user.name'),
                  by_host: perEntityAgg('host.name'),
                  by_service: perEntityAgg('service.name'),
                  daily_active: {
                    date_histogram: { field: '@timestamp', fixed_interval: DAILY_INTERVAL },
                    aggs: {
                      entities: {
                        cardinality: {
                          // Any of the id fields identifies the scored entity.
                          script: {
                            source:
                              "def u=doc['user.name']; def h=doc['host.name']; def s=doc['service.name']; if(u.size()>0) return u.value; if(h.size()>0) return h.value; if(s.size()>0) return s.value; return null;",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            { abortSignal: signal }
          )
        );
        return response.rawResponse.aggregations;
      } catch (err) {
        return undefined;
      }
    },
    {
      enabled: enabled && !!index,
      retry: false,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  /** entityId (prefixed, e.g. `host:...`) → sorted-ascending history points. */
  const pointsByEntityId = useMemo(() => {
    const map = new Map<string, RiskHistoryPoint[]>();
    const ingest = (buckets: EntityHistoryBucket[] | undefined) => {
      for (const bucket of buckets ?? []) {
        const points: RiskHistoryPoint[] = (bucket.points?.buckets ?? [])
          .filter((p) => p.avg_score?.value != null)
          .map((p) => ({ timestamp: p.key, scoreNorm: p.avg_score?.value as number }));
        if (points.length > 0) map.set(bucket.key, points);
      }
    };
    ingest(result?.by_user?.buckets);
    ingest(result?.by_host?.buckets);
    ingest(result?.by_service?.buckets);
    return map;
  }, [result]);

  /** Real distinct-entities-per-day series for the daily-active pulse tile. */
  const dailyActiveSeries = useMemo(() => {
    const buckets = result?.daily_active?.buckets ?? [];
    const series = buckets.map((b) => b.entities?.value ?? 0);
    return series.length >= 2 ? series : undefined;
  }, [result]);

  /**
   * Resolves the trend signal for an entity by its `entity.id`. Falls back to
   * flat/undefined when no history exists for that id.
   */
  const trendForEntity = useMemo(
    () =>
      (entityId: string, currentScore: number): EntityTrendSignal => {
        const points = pointsByEntityId.get(entityId);
        if (!points || points.length === 0) {
          return {
            hasHistory: false,
            riskDeltas: { w1: 0, w7: 0, w30: 0 },
            firstHighAt: undefined,
          };
        }
        return {
          hasHistory: true,
          riskDeltas: riskDeltasFromHistory(points, currentScore, now),
          firstHighAt: firstHighFromHistory(points),
        };
      },
    [pointsByEntityId, now]
  );

  return {
    trendForEntity,
    dailyActiveSeries,
    hasHistory: pointsByEntityId.size > 0,
    isLoading,
    isError,
  };
};
