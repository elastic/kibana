/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { BriefEntityType } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { getRiskLevel } from '../../../../../common/entity_analytics/risk_engine/risk_levels';
import { getEntitiesLatestIndex } from './shared/indices';
import type { EntityAttributes, EntityRef } from './types';

/**
 * Entity Store v2 resolution: alias entities point at their golden entity through
 * `entity.relationships.resolution.resolved_to`. Every euid is collapsed to its golden euid; the
 * golden entity carries the group's display name, type, risk (the resolution score when present),
 * highest criticality and the union of watchlists.
 */

const ENTITY_ID_BATCH = 500;
const GOLDEN_BATCH = 100;
const GROUP_DOCS_PER_BATCH = 1000;

export const PRIVILEGED_WATCHLIST_PREFIX = 'privileged-user-monitoring-watchlist-id';
export const PRIVILEGED_USERS_LABEL = 'Privileged Users';

const CRITICALITY_RANK: Readonly<Record<string, number>> = {
  low_impact: 1,
  medium_impact: 2,
  high_impact: 3,
  extreme_impact: 4,
};

export const ENTITY_SOURCE_FIELDS = [
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.EngineMetadata.Type',
  'entity.risk.calculated_score_norm',
  'entity.risk.calculated_level',
  'entity.relationships.resolution.resolved_to',
  'entity.relationships.resolution.risk.calculated_score_norm',
  'entity.relationships.resolution.risk.calculated_level',
  'entity.attributes.watchlists',
  'asset.criticality',
] as const;

/** One parsed entity-latest document. */
export interface EntityDoc {
  euid: string;
  name: string;
  type: BriefEntityType;
  /** Golden euid when this document is an alias. */
  resolvedTo?: string;
  /** Resolution-group risk when present (golden docs), otherwise the entity's own risk. */
  riskScore?: number;
  riskLevel?: string;
  criticality?: string;
  watchlists: string[];
  privileged: boolean;
}

export interface ResolvedEntity {
  /** Golden euid. */
  euid: string;
  type: BriefEntityType;
  name: string;
  aliasCount: number;
  attributes: EntityAttributes;
}

export interface EntityResolution {
  /** The golden euid of any euid; unknown euids resolve to themselves. */
  golden(euid: string): string;
  /** The resolved golden entity, if it was part of the resolved set. */
  get(goldenEuid: string): ResolvedEntity | undefined;
}

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

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

export const typeFromEuid = (euid: string): BriefEntityType => {
  const prefix = euid.split(':')[0];
  return prefix === 'user' || prefix === 'host' || prefix === 'service' ? prefix : 'generic';
};

/** Best-effort display name for an entity with no document in the store. */
export const nameFromEuid = (euid: string): string => {
  const separator = euid.indexOf(':');
  const body = separator === -1 ? euid : euid.slice(separator + 1);
  return typeFromEuid(euid) === 'user' ? body.split('@')[0] : body;
};

const asEntityType = (value: unknown, euid: string): BriefEntityType => {
  const text = asString(value);
  return text === 'user' || text === 'host' || text === 'service' || text === 'generic'
    ? text
    : typeFromEuid(euid);
};

export const watchlistLabel = (id: string): string =>
  id.startsWith(PRIVILEGED_WATCHLIST_PREFIX) ? PRIVILEGED_USERS_LABEL : id;

export const roundScore = (score: number): number => Math.round(score);

export const parseEntityDoc = (source: unknown): EntityDoc | undefined => {
  const root = asRecord(source);
  const entity = asRecord(root?.entity);
  const euid = asString(entity?.id);
  if (!root || !entity || !euid) {
    return undefined;
  }
  const resolution = asRecord(asRecord(entity.relationships)?.resolution);
  const resolutionRisk = asRecord(resolution?.risk);
  const ownRisk = asRecord(entity.risk);
  const resolutionScore = asNumber(resolutionRisk?.calculated_score_norm);
  const risk = resolutionScore !== undefined ? resolutionRisk : ownRisk;
  const riskScore = asNumber(risk?.calculated_score_norm);
  const watchlists = asStringArray(asRecord(entity.attributes)?.watchlists).sort(compare);
  const resolvedTo = asString(resolution?.resolved_to);

  return {
    euid,
    name: asString(entity.name) ?? nameFromEuid(euid),
    type: asEntityType(asRecord(entity.EngineMetadata)?.Type ?? entity.type, euid),
    ...(resolvedTo && resolvedTo !== euid ? { resolvedTo } : {}),
    ...(riskScore !== undefined
      ? {
          riskScore,
          riskLevel: asString(risk?.calculated_level) ?? getRiskLevel(riskScore),
        }
      : {}),
    ...(asString(asRecord(root.asset)?.criticality)
      ? { criticality: asString(asRecord(root.asset)?.criticality) }
      : {}),
    watchlists,
    privileged: watchlists.some((id) => id.startsWith(PRIVILEGED_WATCHLIST_PREFIX)),
  };
};

const highestCriticality = (docs: EntityDoc[]): string | undefined =>
  docs
    .flatMap(({ criticality }) => (criticality ? [criticality] : []))
    .sort((a, b) => (CRITICALITY_RANK[b] ?? 0) - (CRITICALITY_RANK[a] ?? 0) || compare(a, b))[0];

/** Entity attributes of a golden entity from its own doc and its aliases' docs. */
export const groupAttributes = (
  goldenEuid: string,
  goldenDoc: EntityDoc | undefined,
  aliasDocs: EntityDoc[]
): EntityAttributes => {
  const group = goldenDoc ? [goldenDoc, ...aliasDocs] : aliasDocs;
  const watchlists = [...new Set(group.flatMap((doc) => doc.watchlists).map(watchlistLabel))].sort(
    compare
  );
  const criticality = highestCriticality(group);
  return {
    euid: goldenEuid,
    ...(goldenDoc?.riskScore !== undefined
      ? { riskScore: roundScore(goldenDoc.riskScore), riskLevel: goldenDoc.riskLevel }
      : {}),
    ...(criticality ? { criticality } : {}),
    ...(watchlists.length > 0 ? { watchlists } : {}),
    ...(group.some((doc) => doc.privileged) ? { privileged: true } : {}),
  };
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size));
  }
  return chunks;
};

const searchDocs = async (
  esClient: ElasticsearchClient,
  index: string,
  query: estypes.QueryDslQueryContainer,
  size: number,
  abortSignal: AbortSignal | undefined
): Promise<EntityDoc[]> => {
  const response = await esClient.search<unknown>(
    {
      index,
      size,
      _source: [...ENTITY_SOURCE_FIELDS],
      sort: [{ 'entity.id': 'asc' }],
      query,
    },
    { signal: abortSignal }
  );
  return response.hits.hits.flatMap((hit) => {
    const doc = parseEntityDoc(hit._source);
    return doc ? [doc] : [];
  });
};

/** Resolution where every entity is its own golden entity (no store, or the store failed). */
export const identityResolution = (refs: readonly EntityRef[]): EntityResolution => {
  const byEuid = new Map<string, ResolvedEntity>();
  [...refs]
    .sort((a, b) => compare(a.euid, b.euid))
    .forEach((ref) => {
      if (!byEuid.has(ref.euid)) {
        byEuid.set(ref.euid, {
          euid: ref.euid,
          type: ref.type,
          name: ref.name || nameFromEuid(ref.euid),
          aliasCount: 0,
          attributes: { euid: ref.euid },
        });
      }
    });
  return { golden: (euid) => euid, get: (euid) => byEuid.get(euid) };
};

/**
 * Resolves entity refs to golden entities with batched reads of the entity latest index: docs by
 * id, then each golden's own doc and its aliases. Errors (including a missing index) propagate.
 */
export const resolveEntities = async ({
  esClient,
  spaceId,
  refs,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  refs: readonly EntityRef[];
  abortSignal?: AbortSignal;
}): Promise<EntityResolution> => {
  const index = getEntitiesLatestIndex(spaceId);
  const refByEuid = new Map<string, EntityRef>();
  [...refs]
    .sort((a, b) => compare(a.euid, b.euid))
    .forEach((ref) => {
      if (!refByEuid.has(ref.euid)) refByEuid.set(ref.euid, ref);
    });
  const euids = [...refByEuid.keys()];
  if (euids.length === 0) {
    return identityResolution([]);
  }

  const docs = new Map<string, EntityDoc>();
  for (const batch of chunk(euids, ENTITY_ID_BATCH)) {
    const found = await searchDocs(
      esClient,
      index,
      { terms: { 'entity.id': batch } },
      batch.length,
      abortSignal
    );
    found.forEach((doc) => docs.set(doc.euid, doc));
  }

  const goldenOf = new Map<string, string>(
    euids.map((euid) => [euid, docs.get(euid)?.resolvedTo ?? euid])
  );
  const goldens = [...new Set(goldenOf.values())].sort(compare);

  const aliasesByGolden = new Map<string, Map<string, EntityDoc>>();
  for (const batch of chunk(goldens, GOLDEN_BATCH)) {
    const group = await searchDocs(
      esClient,
      index,
      {
        bool: {
          should: [
            { terms: { 'entity.id': batch } },
            { terms: { 'entity.relationships.resolution.resolved_to': batch } },
          ],
          minimum_should_match: 1,
        },
      },
      GROUP_DOCS_PER_BATCH,
      abortSignal
    );
    group.forEach((doc) => {
      docs.set(doc.euid, doc);
      if (doc.resolvedTo) {
        const aliases = aliasesByGolden.get(doc.resolvedTo) ?? new Map<string, EntityDoc>();
        aliases.set(doc.euid, doc);
        aliasesByGolden.set(doc.resolvedTo, aliases);
      }
    });
  }

  const resolved = new Map<string, ResolvedEntity>();
  for (const golden of goldens) {
    const goldenDoc = docs.get(golden);
    const aliasDocs = [...(aliasesByGolden.get(golden)?.values() ?? [])].sort((a, b) =>
      compare(a.euid, b.euid)
    );
    const ref = refByEuid.get(golden);
    resolved.set(golden, {
      euid: golden,
      type: goldenDoc?.type ?? ref?.type ?? typeFromEuid(golden),
      name: goldenDoc?.name ?? (ref?.name || nameFromEuid(golden)),
      aliasCount: aliasDocs.length,
      attributes: groupAttributes(golden, goldenDoc, aliasDocs),
    });
  }

  return {
    golden: (euid) => goldenOf.get(euid) ?? docs.get(euid)?.resolvedTo ?? euid,
    get: (euid) => resolved.get(euid),
  };
};
