/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { AssetCriticalityLevel, Entity } from '@kbn/entity-store/common';
import { minimalEntityRecord, nameFromEuid, typeFromEuid } from '../entity_record';
import { compareStrings } from './define_signal';
import { getEntitiesLatestIndex } from './shared/indices';
import type { EntityRef } from './types';

/**
 * Entity Store v2 resolution. An alias entity points at its golden entity through
 * `entity.relationships.resolution.resolved_to`; the golden entity and its aliases form a
 * resolution group. The golden entity's record carries the group's risk
 * (`entity.relationships.resolution.risk`); resolution writes the group's highest criticality and
 * the union of its watchlists into it.
 */

const ENTITY_ID_BATCH = 500;
const GOLDEN_BATCH = 100;
const GROUP_DOCS_PER_BATCH = 1000;
const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

const CRITICALITY_RANK: Readonly<Record<string, number>> = {
  low_impact: 1,
  medium_impact: 2,
  high_impact: 3,
  extreme_impact: 4,
};

/** The parts of an Entity Store record the brief reads. */
export const ENTITY_SOURCE_FIELDS = [
  '@timestamp',
  'entity.id',
  'entity.name',
  'entity.type',
  'entity.EngineMetadata.Type',
  'entity.attributes.watchlists',
  'entity.risk',
  RESOLVED_TO_FIELD,
  'entity.relationships.resolution.risk',
  'asset.criticality',
  'user.name',
  'host.name',
  'service.name',
] as const;

/** One entity-latest document. */
export interface EntityDoc {
  euid: string;
  /** Golden euid when this document is an alias. */
  resolvedTo?: string;
  /** The Entity Store record, cut down to `ENTITY_SOURCE_FIELDS`. */
  record: Entity;
  /** Values of the extra `fields` the caller asked for, as returned by the search `fields` API. */
  fields?: Record<string, unknown[]>;
}

export interface EntityResolution {
  /** The golden euid of any euid; unknown euids resolve to themselves. */
  golden(euid: string): string;
  /**
   * The golden entity's record, holding the whole group's criticality and watchlists; undefined
   * when the store has no document for the group.
   */
  get(goldenEuid: string): Entity | undefined;
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

export const parseEntityDoc = (record: Entity | undefined): EntityDoc | undefined => {
  const euid = record?.entity?.id;
  if (!record || !euid) {
    return undefined;
  }
  const resolvedTo = record.entity?.relationships?.resolution?.resolved_to;
  return { euid, ...(resolvedTo && resolvedTo !== euid ? { resolvedTo } : {}), record };
};

const highestCriticality = (records: readonly Entity[]): AssetCriticalityLevel | undefined =>
  records
    .flatMap(({ asset }) => (asset?.criticality ? [asset.criticality] : []))
    .sort(
      (a, b) => (CRITICALITY_RANK[b] ?? 0) - (CRITICALITY_RANK[a] ?? 0) || compareStrings(a, b)
    )[0];

/**
 * The golden entity's record with the group's highest criticality and the union of its
 * watchlists. Without a golden document, a minimal record stands in; without any document,
 * there is no record.
 */
export const groupRecord = (
  golden: EntityRef,
  goldenRecord: Entity | undefined,
  aliasRecords: readonly Entity[]
): Entity | undefined => {
  if (!goldenRecord && aliasRecords.length === 0) {
    return undefined;
  }
  const base = goldenRecord ?? minimalEntityRecord(golden);
  const group = [base, ...aliasRecords];
  const watchlists = [
    ...new Set(group.flatMap(({ entity }) => entity?.attributes?.watchlists ?? [])),
  ].sort(compareStrings);
  const criticality = highestCriticality(group);
  return {
    ...base,
    entity: {
      ...base.entity,
      ...(watchlists.length > 0 ? { attributes: { ...base.entity?.attributes, watchlists } } : {}),
    },
    ...(criticality ? { asset: { ...base.asset, criticality } } : {}),
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
  const response = await esClient.search<Entity>(
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

/** Resolution where every entity is its own golden entity and has no record (no store, or it failed). */
export const identityResolution = (): EntityResolution => ({
  golden: (euid) => euid,
  get: () => undefined,
  membersOf: (euid) => [euid],
  docOf: () => undefined,
});

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

  const resolved = new Map<string, Entity>();
  const members = new Map<string, string[]>();
  for (const golden of goldens) {
    const aliasDocs = [...(aliasesByGolden.get(golden)?.values() ?? [])].sort((a, b) =>
      compareStrings(a.euid, b.euid)
    );
    const ref = refByEuid.get(golden);
    members.set(golden, [golden, ...aliasDocs.map(({ euid }) => euid)]);
    const record = groupRecord(
      {
        euid: golden,
        type: ref?.type ?? typeFromEuid(golden),
        name: ref?.name || nameFromEuid(golden),
      },
      docs.get(golden)?.record,
      aliasDocs.map((doc) => doc.record)
    );
    if (record) {
      resolved.set(golden, record);
    }
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
    return identityResolution();
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
    return identityResolution();
  }
  const goldenOf = new Map([...refByEuid.keys()].map((euid) => [euid, euid]));
  return resolveGroups(options, refByEuid, goldenOf, new Map());
};
