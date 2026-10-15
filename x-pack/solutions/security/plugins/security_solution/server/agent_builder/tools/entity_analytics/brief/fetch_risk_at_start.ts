/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniq } from 'lodash';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import { getRiskScoreTimeSeriesIndex } from '../../../../../common/entity_analytics/risk_engine/indices';
import type { BriefCandidate, RiskAtStart } from './brief_types';
import { getPeriodStart } from './describe_scope';
import { expandAliases } from './expand_aliases';

const RISK_ENTITY_TYPES = ['host', 'user', 'service'] as const;
/** As on the Risk movers tile: scoring runs hourly, so two hours always hold a run. */
const BOUNDARY_WINDOW_MS = 2 * 3_600_000;

interface TypeAggregation {
  buckets: Array<{
    key: string;
    last: {
      hits: {
        hits: Array<{ _source?: Record<string, { risk?: { calculated_score_norm?: number } }> }>;
      };
    };
  }>;
}

/** Aliases, then base scores at the period start by the Risk movers rule (`tile_risk_movers_query.ts`, in `public/`). */
export const fetchRiskAtStart = async ({
  candidates,
  scope,
  spaceId,
  esClient,
}: {
  candidates: BriefCandidate[];
  scope: EntityAnalyticsScope;
  spaceId: string;
  esClient: ElasticsearchClient;
}): Promise<RiskAtStart> => {
  const aliasesById = await expandAliases({
    entityIds: candidates.map(({ id }) => id),
    spaceId,
    esClient,
  });
  const records = [...candidates.map(({ record }) => record), ...[...aliasesById.values()].flat()];
  const entityIds = uniq(
    compact([...candidates.map(({ id }) => id), ...records.map(({ entity }) => entity?.id)])
  );
  const start = getPeriodStart(scope);
  const response = await esClient.search<unknown, Record<string, TypeAggregation>>({
    index: getRiskScoreTimeSeriesIndex(spaceId),
    size: 0,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: new Date(start.getTime() - BOUNDARY_WINDOW_MS).toISOString(),
                lte: start.toISOString(),
              },
            },
          },
          {
            bool: {
              should: RISK_ENTITY_TYPES.map((type) => ({
                terms: { [`${type}.risk.id_value`]: entityIds },
              })),
              minimum_should_match: 1,
            },
          },
        ],
        // Resolution scores share the golden entity's id, and "now" is the entity's own base score.
        must_not: RISK_ENTITY_TYPES.map((type) => ({
          term: { [`${type}.risk.score_type`]: 'resolution' },
        })),
      },
    },
    aggs: Object.fromEntries(
      RISK_ENTITY_TYPES.map((type) => [
        type,
        {
          terms: { field: `${type}.risk.id_value`, include: entityIds, size: entityIds.length },
          aggs: {
            last: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': 'desc' as const }],
                _source: [`${type}.risk.calculated_score_norm`],
              },
            },
          },
        },
      ])
    ),
  });

  const scoresById = new Map<string, number>();
  for (const type of RISK_ENTITY_TYPES) {
    for (const { key, last } of response.aggregations?.[type]?.buckets ?? []) {
      const score = last.hits.hits[0]?._source?.[type]?.risk?.calculated_score_norm;
      if (score !== undefined && Number.isFinite(score)) {
        scoresById.set(key, score);
      }
    }
  }
  return { aliasesById, scoresById };
};
