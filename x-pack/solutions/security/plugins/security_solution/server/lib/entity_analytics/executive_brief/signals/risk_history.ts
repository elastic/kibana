/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { BriefSignal, FactDraft } from './types';
import { getRiskScoreHistoryIndex } from './shared/indices';

/** Minimum day-over-day rise (in normalised score points) that counts as a jump. */
const RISK_JUMP_MIN_DELTA = 10;
const RISK_TYPES = ['host', 'user', 'service'] as const;

interface TimePoint {
  t: string;
  v: number;
}

interface DayBucket {
  key: number;
  key_as_string?: string;
  score?: { value?: number | null };
}
interface RiskEntityBucket {
  key: string;
  days?: { buckets?: DayBucket[] };
}

interface RiskJump {
  /** ISO time of the later point of the jump. */
  at: string;
  from: number;
  to: number;
}

/** Largest day-over-day rise in a daily-max series, when it is at least the threshold. */
const findLargestJump = (series: TimePoint[]): RiskJump | undefined => {
  const sorted = [...series].sort((a, b) => a.t.localeCompare(b.t));
  let best: RiskJump | undefined;
  let bestDelta = 0;
  for (let index = 1; index < sorted.length; index++) {
    const delta = sorted[index].v - sorted[index - 1].v;
    if (delta > bestDelta) {
      bestDelta = delta;
      best = {
        at: sorted[index].t,
        from: Math.round(sorted[index - 1].v),
        to: Math.round(sorted[index].v),
      };
    }
  }
  return bestDelta >= RISK_JUMP_MIN_DELTA ? best : undefined;
};

/**
 * Risk score jumps within the window. Series are matched by `<type>.risk.id_value` of the golden
 * euid: for entities with aliases the risk engine writes the resolution score under the golden
 * id, so the golden series already is the resolved score (alias series are not merged in).
 */
export const riskHistorySignal: BriefSignal<'entities'> = {
  id: 'risk_history',
  title: 'Risk score history',
  capability: 'risk_scoring',
  scope: 'entities',
  isAvailable: async () => ({ available: true }),
  run: async (ctx, { entities }, abortSignal) => {
    if (entities.length === 0) {
      return { facts: [] };
    }
    const { esClient, spaceId, timeRange } = ctx;
    const ids = [...new Set(entities.map(({ euid }) => euid))].sort();

    const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
    for (const type of RISK_TYPES) {
      aggs[type] = {
        terms: { field: `${type}.risk.id_value`, include: ids, size: ids.length },
        aggs: {
          days: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1d',
              time_zone: 'UTC',
              min_doc_count: 1,
            },
            aggs: { score: { max: { field: `${type}.risk.calculated_score_norm` } } },
          },
        },
      };
    }
    const response = await esClient.search(
      {
        index: getRiskScoreHistoryIndex(spaceId),
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { '@timestamp': { gte: timeRange.from, lte: timeRange.to } } },
              {
                bool: {
                  should: RISK_TYPES.map((type) => ({
                    terms: { [`${type}.risk.id_value`]: ids },
                  })),
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs,
      },
      { signal: abortSignal }
    );

    const aggregations = (response.aggregations ?? {}) as Record<
      string,
      { buckets?: RiskEntityBucket[] }
    >;
    const seriesByEuid = new Map<string, TimePoint[]>();
    for (const type of RISK_TYPES) {
      for (const bucket of aggregations[type]?.buckets ?? []) {
        const points = (bucket.days?.buckets ?? []).flatMap((day): TimePoint[] =>
          typeof day.score?.value === 'number'
            ? [
                {
                  t: day.key_as_string ?? new Date(day.key).toISOString(),
                  v: Math.round(day.score.value * 100) / 100,
                },
              ]
            : []
        );
        seriesByEuid.set(String(bucket.key), [
          ...(seriesByEuid.get(String(bucket.key)) ?? []),
          ...points,
        ]);
      }
    }

    const facts: FactDraft[] = [];
    for (const entity of entities) {
      const jump = findLargestJump(seriesByEuid.get(entity.euid) ?? []);
      if (jump) {
        facts.push({
          kind: 'risk_jump',
          title: `Risk jump for ${entity.name}`,
          at: jump.at,
          entities: [entity],
          numbers: { from: jump.from, to: jump.to, delta: jump.to - jump.from },
        });
      }
    }
    return { facts };
  },
};
