/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefEntityType,
  BriefRiskLevel,
  RiskConcentrationCell,
} from '../../../../../../common/entity_analytics/executive_brief/types';
import { MAX_EXPOSURE_LEADERS } from '../../../../../../common/entity_analytics/executive_brief/constants';
import type { SnapshotContext } from '../context';
import { QUERY_TIMEOUT_MS } from './esql';

const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';
const RESOLUTION_RISK_PREFIX = 'entity.relationships.resolution.risk';
const ENTITY_RISK_PREFIX = 'entity.risk';
/** Runtime fields: a golden entity's risk lives under resolution risk, others under entity.risk. */
const SCORE_FIELD = 'brief_risk_norm';
const LEVEL_FIELD = 'brief_risk_level';

const preferResolutionRisk = (suffix: string): string => {
  const resolution = `${RESOLUTION_RISK_PREFIX}.${suffix}`;
  const own = `${ENTITY_RISK_PREFIX}.${suffix}`;
  return `
    if (doc.containsKey('${resolution}') && doc['${resolution}'].size() > 0) {
      emit(doc['${resolution}'].value);
    } else if (doc.containsKey('${own}') && doc['${own}'].size() > 0) {
      emit(doc['${own}'].value);
    }`
    .replace(/\s+/g, ' ')
    .trim();
};

export const RISK_RUNTIME_MAPPINGS = {
  [SCORE_FIELD]: {
    type: 'double' as const,
    script: { source: preferResolutionRisk('calculated_score_norm') },
  },
  [LEVEL_FIELD]: {
    type: 'keyword' as const,
    script: { source: preferResolutionRisk('calculated_level') },
  },
};

/** Golden view: alias entities are collapsed into the entity they resolve to. */
const GOLDEN_ONLY = { must_not: [{ exists: { field: RESOLVED_TO_FIELD } }] };
const TYPE_FIELD = 'entity.EngineMetadata.Type';

interface PostureAggs {
  avgScore: { value: number | null };
  byType: {
    buckets: Array<{
      key: string;
      doc_count: number;
      byLevel: { buckets: Array<{ key: string; doc_count: number }> };
    }>;
  };
}

export interface Posture {
  /** Average normalised risk score over scored entities; undefined when none are scored. */
  postureScore?: number;
  /** High + Critical entities. */
  materialRiskEntities: number;
  concentration: RiskConcentrationCell[];
}

const ENTITY_TYPES: readonly BriefEntityType[] = ['user', 'host', 'service', 'generic'];
const RISK_LEVELS: readonly BriefRiskLevel[] = ['Critical', 'High', 'Moderate', 'Low', 'Unknown'];

const toEntityType = (key: string): BriefEntityType =>
  ENTITY_TYPES.find((type) => type === key) ?? 'generic';
const toRiskLevel = (key: string): BriefRiskLevel =>
  RISK_LEVELS.find((level) => level === key) ?? 'Unknown';

/** Average score + type x level distribution over the entities that have a risk score. */
export const getPosture = async (ctx: SnapshotContext, latestIndex: string): Promise<Posture> => {
  const signal = AbortSignal.any([ctx.abortSignal, AbortSignal.timeout(QUERY_TIMEOUT_MS)]);
  const response = await ctx.esClient.search<unknown, PostureAggs>(
    {
      index: latestIndex,
      size: 0,
      runtime_mappings: RISK_RUNTIME_MAPPINGS,
      query: { bool: { filter: [{ exists: { field: SCORE_FIELD } }], ...GOLDEN_ONLY } },
      aggs: {
        avgScore: { avg: { field: SCORE_FIELD } },
        byType: {
          terms: { field: TYPE_FIELD, size: 10 },
          aggs: { byLevel: { terms: { field: LEVEL_FIELD, size: 10 } } },
        },
      },
    },
    { signal }
  );

  const avg = response.aggregations?.avgScore.value;
  const buckets = response.aggregations?.byType.buckets ?? [];

  // Entities of the same type can arrive in several buckets only if keys normalise to one type.
  const cells = new Map<string, RiskConcentrationCell>();
  for (const typeBucket of buckets) {
    const type = toEntityType(typeBucket.key);
    for (const levelBucket of typeBucket.byLevel.buckets) {
      const level = toRiskLevel(levelBucket.key);
      const key = `${type}|${level}`;
      const existing = cells.get(key);
      cells.set(key, {
        type,
        level,
        count: (existing?.count ?? 0) + levelBucket.doc_count,
      });
    }
  }

  const concentration = [...cells.values()].sort(
    (a, b) =>
      ENTITY_TYPES.indexOf(a.type) - ENTITY_TYPES.indexOf(b.type) ||
      RISK_LEVELS.indexOf(a.level) - RISK_LEVELS.indexOf(b.level)
  );

  return {
    postureScore: typeof avg === 'number' ? Math.round(avg) : undefined,
    materialRiskEntities: concentration
      .filter(({ level }) => level === 'High' || level === 'Critical')
      .reduce((sum, { count }) => sum + count, 0),
    concentration,
  };
};

interface LeaderSource {
  entity?: { id?: string };
}

/** Top golden entities (aliases excluded) by normalised risk, ties broken by id. */
export const getExposureLeaders = async (
  ctx: SnapshotContext,
  latestIndex: string
): Promise<string[]> => {
  const signal = AbortSignal.any([ctx.abortSignal, AbortSignal.timeout(QUERY_TIMEOUT_MS)]);
  const response = await ctx.esClient.search<LeaderSource>(
    {
      index: latestIndex,
      size: MAX_EXPOSURE_LEADERS,
      _source: ['entity.id'],
      runtime_mappings: RISK_RUNTIME_MAPPINGS,
      query: { bool: { filter: [{ exists: { field: SCORE_FIELD } }], ...GOLDEN_ONLY } },
      sort: [{ [SCORE_FIELD]: { order: 'desc' } }, { 'entity.id': { order: 'asc' } }],
    },
    { signal }
  );
  return response.hits.hits
    .map((hit) => hit._source?.entity?.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
};
