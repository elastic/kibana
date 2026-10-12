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
import { compareStrings } from './define_signal';
import { getEntitiesLatestIndex } from './shared/indices';
import type { EntityAttributes, EntityRef } from './types';

/**
 * Entity Store v2 resolution. An alias entity points at its golden entity through
 * `entity.relationships.resolution.resolved_to`; the golden entity and its aliases form a
 * resolution group. The golden entity carries the group's display name, type and risk (the
 * resolution score when present), the highest criticality and the union of watchlists.
 */

const ENTITY_ID_BATCH = 500;
const GOLDEN_BATCH = 100;
const GROUP_DOCS_PER_BATCH = 1000;
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

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
  RESOLVED_TO_FIELD,
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
  /** Values of the extra `fields` the caller asked for, as returned by the search `fields` API. */
  fields?: Record<string, unknown[]>;
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
  /**
   * The golden euid followed by its aliases (sorted). Alerts, risk scores and metadata can be
   * stamped with any member's euid, so entity-scoped queries should match on all of them.
   */
  membersOf(goldenEuid: string): string[];
  /** The store document of any group member (golden or alias), when there is one. */
  docOf(euid: string): EntityDoc | undefined;
}

interface ResolveOptions {
  esClient: ElasticsearchClient;
  spaceId: string;
  /** Extra fields to read from every member document, exposed through `docOf(euid).fields`. */
  fields?: readonly string[];
  abortSignal?: AbortSignal;
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

export const typeFromEuid = (euid: string): BriefEntityType => {
  const [prefix] = euid.split(':');
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
  const risk =
    asNumber(resolutionRisk?.calculated_score_norm) !== undefined ? resolutionRisk : ownRisk;
  const riskScore = asNumber(risk?.calculated_score_norm);
  const watchlists = asStringArray(asRecord(entity.attributes)?.watchlists).sort(compareStrings);
  const resolvedTo = asString(resolution?.resolved_to);
  const criticality = asString(asRecord(root.asset)?.criticality);

  return {
    euid,
    name: asString(entity.name) ?? nameFromEuid(euid),
    type: asEntityType(asRecord(entity.EngineMetadata)?.Type ?? entity.type, euid),
    ...(resolvedTo && resolvedTo !== euid ? { resolvedTo } : {}),
    ...(riskScore !== undefined
      ? { riskScore, riskLevel: asString(risk?.calculated_level) ?? getRiskLevel(riskScore) }
      : {}),
    ...(criticality ? { criticality } : {}),
    watchlists,
    privileged: watchlists.some((id) => id.startsWith(PRIVILEGED_WATCHLIST_PREFIX)),
  };
};

const highestCriticality = (docs: readonly EntityDoc[]): string | undefined =>
  docs
    .flatMap(({ criticality }) => (criticality ? [criticality] : []))
    .sort(
      (a, b) => (CRITICALITY_RANK[b] ?? 0) - (CRITICALITY_RANK[a] ?? 0) || compareStrings(a, b)
    )[0];

/** Entity attributes of a golden entity from its own doc and its aliases' docs. */
export const groupAttributes = (
  goldenEuid: string,
  goldenDoc: EntityDoc | undefined,
  aliasDocs: readonly EntityDoc[]
): EntityAttributes => {
  const group = goldenDoc ? [goldenDoc, ...aliasDocs] : [...aliasDocs];
  const watchlists = [...new Set(group.flatMap((doc) => doc.watchlists).map(watchlistLabel))].sort(
    compareStrings
  );
  const criticality = highestCriticality(group);
  return {
    euid: goldenEuid,
    ...(goldenDoc?.riskScore !== undefined
      ? { riskScore: Math.round(goldenDoc.riskScore), riskLevel: goldenDoc.riskLevel }
      : {}),
    ...(criticality ? { criticality } : {}),
    ...(watchlists.length > 0 ? { watchlists } : {}),
    ...(group.some((doc) => doc.privileged) ? { privileged: true } : {}),
  };
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    chunks.push(items.slice(offset, offset + size));
  }
  return chunks;
};

const uniqueRefs = (refs: readonly EntityRef[]): Map<string, EntityRef> => {
  const byEuid = new Map<string, EntityRef>();
  [...refs]
    .sort((a, b) => compareStrings(a.euid, b.euid))
    .forEach((ref) => {
      if (!byEuid.has(ref.euid)) byEuid.set(ref.euid, ref);
    });
  return byEuid;
};

const searchDocs = async (
  { esClient, spaceId, fields = [], abortSignal }: ResolveOptions,
  query: estypes.QueryDslQueryContainer,
  size: number
): Promise<EntityDoc[]> => {
  const response = await esClient.search<unknown>(
    {
      index: getEntitiesLatestIndex(spaceId),
      size,
      _source: [...ENTITY_SOURCE_FIELDS],
      ...(fields.length > 0 ? { fields: [...fields] } : {}),
      sort: [{ 'entity.id': 'asc' }],
      query,
    },
    { signal: abortSignal }
  );
  return response.hits.hits.flatMap((hit) => {
    const doc = parseEntityDoc(hit._source);
    if (!doc) {
      return [];
    }
    return fields.length > 0 ? [{ ...doc, fields: hit.fields ?? {} }] : [doc];
  });
};

/** Resolution where every entity is its own golden entity (no store, or the store failed). */
export const identityResolution = (refs: readonly EntityRef[]): EntityResolution => {
  const byEuid = new Map<string, ResolvedEntity>();
  uniqueRefs(refs).forEach((ref, euid) =>
    byEuid.set(euid, {
      euid,
      type: ref.type,
      name: ref.name || nameFromEuid(euid),
      aliasCount: 0,
      attributes: { euid },
    })
  );
  return {
    golden: (euid) => euid,
    get: (euid) => byEuid.get(euid),
    membersOf: (euid) => [euid],
    docOf: () => undefined,
  };
};

/**
 * Reads the resolution groups of `goldens` (each golden doc plus every alias that resolves to it)
 * and builds the resolution. `goldenOfInput` maps each input euid to its golden euid; `docs`
 * holds documents already read and receives the group documents.
 */
const resolveGroups = async (
  options: ResolveOptions,
  refByEuid: ReadonlyMap<string, EntityRef>,
  goldenOfInput: ReadonlyMap<string, string>,
  docs: Map<string, EntityDoc>
): Promise<EntityResolution> => {
  const goldens = [...new Set(goldenOfInput.values())].sort(compareStrings);
  const goldenSet = new Set(goldens);
  const goldenOf = new Map(goldenOfInput);
  const aliasesByGolden = new Map<string, Map<string, EntityDoc>>();

  for (const batch of chunk(goldens, GOLDEN_BATCH)) {
    const group = await searchDocs(
      options,
      {
        bool: {
          should: [{ terms: { 'entity.id': batch } }, { terms: { [RESOLVED_TO_FIELD]: batch } }],
          minimum_should_match: 1,
        },
      },
      GROUP_DOCS_PER_BATCH
    );
    for (const doc of group) {
      docs.set(doc.euid, doc);
      if (doc.resolvedTo && goldenSet.has(doc.resolvedTo) && !goldenSet.has(doc.euid)) {
        goldenOf.set(doc.euid, doc.resolvedTo);
        const aliases = aliasesByGolden.get(doc.resolvedTo) ?? new Map<string, EntityDoc>();
        aliases.set(doc.euid, doc);
        aliasesByGolden.set(doc.resolvedTo, aliases);
      }
    }
  }

  const resolved = new Map<string, ResolvedEntity>();
  const members = new Map<string, string[]>();
  for (const golden of goldens) {
    const goldenDoc = docs.get(golden);
    const aliasDocs = [...(aliasesByGolden.get(golden)?.values() ?? [])].sort((a, b) =>
      compareStrings(a.euid, b.euid)
    );
    const ref = refByEuid.get(golden);
    members.set(golden, [golden, ...aliasDocs.map(({ euid }) => euid)]);
    resolved.set(golden, {
      euid: golden,
      type: goldenDoc?.type ?? ref?.type ?? typeFromEuid(golden),
      name: goldenDoc?.name ?? (ref?.name || nameFromEuid(golden)),
      aliasCount: aliasDocs.length,
      attributes: groupAttributes(golden, goldenDoc, aliasDocs),
    });
  }

  return {
    golden: (euid) => goldenOf.get(euid) ?? euid,
    get: (euid) => resolved.get(euid),
    membersOf: (euid) => members.get(euid) ?? [euid],
    docOf: (euid) => docs.get(euid),
  };
};

/**
 * Resolves arbitrary entity refs (golden or alias) to golden entities with batched reads of the
 * entity latest index: the refs' own docs to find their golden euid, then each golden's group.
 * Errors, including a missing index, propagate.
 */
export const resolveEntities = async ({
  refs,
  ...options
}: ResolveOptions & { refs: readonly EntityRef[] }): Promise<EntityResolution> => {
  const refByEuid = uniqueRefs(refs);
  const euids = [...refByEuid.keys()];
  if (euids.length === 0) {
    return identityResolution([]);
  }

  const docs = new Map<string, EntityDoc>();
  for (const batch of chunk(euids, ENTITY_ID_BATCH)) {
    const found = await searchDocs(options, { terms: { 'entity.id': batch } }, batch.length);
    found.forEach((doc) => docs.set(doc.euid, doc));
  }
  const goldenOf = new Map(euids.map((euid) => [euid, docs.get(euid)?.resolvedTo ?? euid]));
  return resolveGroups(options, refByEuid, goldenOf, docs);
};

/**
 * Expands entities that are already golden (such as the engine's candidate set) to their
 * resolution groups, skipping the golden lookup. Entity-scoped signals use `membersOf` to match
 * data stamped with any alias, and `fields` to read extra attributes of every member in the
 * same search. Errors, including a missing index, propagate.
 */
export const expandResolutionGroups = async ({
  entities,
  ...options
}: ResolveOptions & { entities: readonly EntityRef[] }): Promise<EntityResolution> => {
  const refByEuid = uniqueRefs(entities);
  if (refByEuid.size === 0) {
    return identityResolution([]);
  }
  const goldenOf = new Map([...refByEuid.keys()].map((euid) => [euid, euid]));
  return resolveGroups(options, refByEuid, goldenOf, new Map());
};
