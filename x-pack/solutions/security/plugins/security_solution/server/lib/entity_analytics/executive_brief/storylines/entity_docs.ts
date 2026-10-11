/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { ENTITY_LATEST, getEntitiesAlias } from '@kbn/entity-store/server';
import type {
  BriefEntityType,
  BriefRiskLevel,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import { matchesPrivilegedWatchlist } from '../../lead_generation/observation_modules/utils';

export const RELATIONSHIP_KINDS = [
  'owns',
  'administers',
  'accesses_infrequently',
  'accesses_frequently',
  'communicates_with',
  'supervises',
] as const;
export type RelationshipKind = (typeof RELATIONSHIP_KINDS)[number];

export const PRIVILEGED_USERS_LABEL = 'Privileged Users';

const ENTITY_FETCH_BATCH = 500;
const MAX_RELATIONSHIP_TARGETS_PER_KIND = 50;

export const ENTITY_SOURCE_FIELDS = [
  'entity.id',
  'entity.name',
  'entity.EngineMetadata.Type',
  'entity.namespace',
  'entity.risk.calculated_score_norm',
  'entity.risk.calculated_level',
  'entity.relationships.resolution.resolved_to',
  'entity.relationships.resolution.risk.calculated_score_norm',
  'entity.relationships.resolution.risk.calculated_level',
  'entity.attributes.watchlists',
  'entity.attributes.managed',
  'asset.criticality',
  ...RELATIONSHIP_KINDS.map((kind) => `entity.relationships.${kind}.ids`),
];

export interface EntityDoc {
  euid: string;
  name: string;
  type: BriefEntityType;
  /** Golden euid when this is an alias. */
  resolvedTo?: string;
  /** Own (base) risk. */
  riskScoreNorm?: number;
  riskLevel?: BriefRiskLevel;
  /** Aggregated risk of the resolution group, on golden entities. */
  resolutionRiskScoreNorm?: number;
  resolutionRiskLevel?: BriefRiskLevel;
  criticality?: string;
  watchlistIds: string[];
  isPrivileged: boolean;
  managed: boolean;
  /** Target euids per relationship kind, capped. */
  relationships: Partial<Record<RelationshipKind, string[]>>;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const asString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 ? first : undefined;
};

const asNumber = (value: unknown): number | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'number' && Number.isFinite(first) ? first : undefined;
};

const asStringArray = (value: unknown): string[] => {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return list.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

const BRIEF_RISK_LEVELS: readonly BriefRiskLevel[] = [
  'Critical',
  'High',
  'Moderate',
  'Low',
  'Unknown',
];
const asRiskLevel = (value: unknown, scoreNorm: number | undefined): BriefRiskLevel | undefined => {
  const text = asString(value);
  const match = BRIEF_RISK_LEVELS.find((level) => level === text);
  if (match) {
    return match;
  }
  return scoreNorm === undefined ? undefined : getRiskLevel(scoreNorm);
};

export const typeFromEuid = (euid: string): BriefEntityType => {
  const prefix = euid.split(':')[0];
  return prefix === 'user' || prefix === 'host' || prefix === 'service' ? prefix : 'generic';
};

const asEntityType = (value: unknown, euid: string): BriefEntityType => {
  const text = asString(value);
  return text === 'user' || text === 'host' || text === 'service' || text === 'generic'
    ? text
    : typeFromEuid(euid);
};

/** Best-effort display name from an euid, for entities with no document in the store. */
export const nameFromEuid = (euid: string): string => {
  const body = euid.slice(euid.indexOf(':') + 1);
  return typeFromEuid(euid) === 'user' ? body.split('@')[0] : body;
};

export const parseEntityDoc = (source: unknown): EntityDoc | undefined => {
  const root = asRecord(source);
  const entity = asRecord(root?.entity);
  const euid = asString(entity?.id);
  if (!root || !entity || !euid) {
    return undefined;
  }
  const relationships = asRecord(entity.relationships);
  const resolution = asRecord(relationships?.resolution);
  const resolutionRisk = asRecord(resolution?.risk);
  const risk = asRecord(entity.risk);
  const attributes = asRecord(entity.attributes);
  const asset = asRecord(root.asset);
  const watchlistIds = asStringArray(attributes?.watchlists);

  const riskScoreNorm = asNumber(risk?.calculated_score_norm);
  const resolutionRiskScoreNorm = asNumber(resolutionRisk?.calculated_score_norm);

  const parsedRelationships: EntityDoc['relationships'] = {};
  for (const kind of RELATIONSHIP_KINDS) {
    const ids = asStringArray(asRecord(relationships?.[kind])?.ids)
      .sort()
      .slice(0, MAX_RELATIONSHIP_TARGETS_PER_KIND);
    if (ids.length > 0) {
      parsedRelationships[kind] = ids;
    }
  }

  return {
    euid,
    name: asString(entity.name) ?? nameFromEuid(euid),
    type: asEntityType(asRecord(entity.EngineMetadata)?.Type, euid),
    resolvedTo: asString(resolution?.resolved_to),
    riskScoreNorm,
    riskLevel: asRiskLevel(risk?.calculated_level, riskScoreNorm),
    resolutionRiskScoreNorm,
    resolutionRiskLevel: asRiskLevel(resolutionRisk?.calculated_level, resolutionRiskScoreNorm),
    criticality: asString(asset?.criticality),
    watchlistIds,
    isPrivileged: matchesPrivilegedWatchlist(watchlistIds),
    managed: attributes?.managed === true,
    relationships: parsedRelationships,
  };
};

export const getLatestEntityAlias = (spaceId: string): string =>
  getEntitiesAlias(ENTITY_LATEST, spaceId);

const parseHits = (hits: Array<estypes.SearchHit<unknown>>): EntityDoc[] =>
  hits.flatMap((hit) => {
    const doc = parseEntityDoc(hit._source);
    return doc ? [doc] : [];
  });

/**
 * Entity docs by `entity.id`, batched. Errors (including a missing index) propagate: the callers
 * report them as source statuses instead of silently treating entities as absent.
 */
export const fetchEntityDocsById = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  euids: string[],
  signal?: AbortSignal
): Promise<EntityDoc[]> => {
  const unique = [...new Set(euids)].sort();
  const docs: EntityDoc[] = [];
  for (let offset = 0; offset < unique.length; offset += ENTITY_FETCH_BATCH) {
    const batch = unique.slice(offset, offset + ENTITY_FETCH_BATCH);
    const response = await esClient.search<unknown>(
      {
        index: getLatestEntityAlias(spaceId),
        size: batch.length,
        _source: ENTITY_SOURCE_FIELDS,
        query: { terms: { 'entity.id': batch } },
      },
      { signal }
    );
    docs.push(...parseHits(response.hits.hits));
  }
  return docs;
};

/** Alias docs of the given golden euids (`resolved_to`), plus any golden docs not yet fetched. */
export const fetchResolutionGroupDocs = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  goldenEuids: string[],
  missingGoldenDocIds: string[],
  signal?: AbortSignal
): Promise<EntityDoc[]> => {
  const goldens = [...new Set(goldenEuids)].sort();
  const missing = [...new Set(missingGoldenDocIds)].sort();
  if (goldens.length === 0 && missing.length === 0) {
    return [];
  }
  const response = await esClient.search<unknown>(
    {
      index: getLatestEntityAlias(spaceId),
      size: 1000,
      _source: ENTITY_SOURCE_FIELDS,
      sort: [{ 'entity.id': 'asc' }],
      query: {
        bool: {
          should: [
            ...(goldens.length
              ? [{ terms: { 'entity.relationships.resolution.resolved_to': goldens } }]
              : []),
            ...(missing.length ? [{ terms: { 'entity.id': missing } }] : []),
          ],
          minimum_should_match: 1,
        },
      },
    },
    { signal }
  );
  return parseHits(response.hits.hits);
};
