/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Entity } from '../../../../common/api/entity_analytics';
import { CriticalityLevels } from '../../../../common/entity_analytics/asset_criticality/constants';
import type { CriticalityLevelWithUnassigned } from '../../../../common/entity_analytics/asset_criticality/types';
import { toEntitySourceArray } from './components/entity_source_value';

/**
 * Whether the flyout shows a resolution group rather than a single entity, i.e. the primary record
 * has at least one alias. A target with no aliases keeps the regular single-entity behaviour.
 */
export const isEntityGroupView = <T>(
  aliasRecords: readonly T[] | undefined
): aliasRecords is readonly T[] => (aliasRecords?.length ?? 0) > 0;

/**
 * Number of records the open entity is resolved from (target + aliases), or `undefined` when no
 * aliases were loaded — the header then falls back to the plain "Entity Store" badge. Aliases are
 * only loaded in the resolution-group view, which the flyout panels gate on the new entity
 * analytics page, so no feature-flag check is needed here.
 */
export const getResolvedFromRecordCount = (
  aliasRecords: readonly unknown[] | undefined
): number | undefined => (isEntityGroupView(aliasRecords) ? aliasRecords.length + 1 : undefined);

/** Most severe first. `unassigned` (and any unknown value) is treated as "no criticality". */
const CRITICALITY_RANK: readonly string[] = [
  CriticalityLevels.EXTREME_IMPACT,
  CriticalityLevels.HIGH_IMPACT,
  CriticalityLevels.MEDIUM_IMPACT,
  CriticalityLevels.LOW_IMPACT,
];

/**
 * Most severe assigned asset criticality across the records, or `undefined` when none is assigned
 * (callers render `undefined` as the "unassigned" badge).
 */
export const getMaxCriticality = (
  records: ReadonlyArray<Pick<Entity, 'asset'>>
): CriticalityLevelWithUnassigned | undefined => {
  let bestRank = CRITICALITY_RANK.length;
  for (const record of records) {
    const level = record.asset?.criticality;
    const rank = level ? CRITICALITY_RANK.indexOf(level) : -1;
    if (rank !== -1 && rank < bestRank) {
      bestRank = rank;
    }
  }
  return bestRank === CRITICALITY_RANK.length
    ? undefined
    : (CRITICALITY_RANK[bestRank] as CriticalityLevelWithUnassigned);
};

/** Watchlist ids stored on a single record under `entity.attributes.watchlists`. */
export const getWatchlistIds = (record: Pick<Entity, 'entity'>): string[] => {
  const attributes = (record.entity as Record<string, unknown> | undefined)?.attributes as
    | Record<string, unknown>
    | undefined;
  const watchlists = attributes?.watchlists;
  return Array.isArray(watchlists)
    ? watchlists.filter((id): id is string => typeof id === 'string' && id !== '')
    : [];
};

/** De-duplicated watchlist ids across the records, preserving first-seen order. */
export const getUnionWatchlistIds = (records: ReadonlyArray<Pick<Entity, 'entity'>>): string[] => {
  const seen = new Set<string>();
  for (const record of records) {
    for (const id of getWatchlistIds(record)) {
      seen.add(id);
    }
  }
  return Array.from(seen);
};

/**
 * The records a query should cover for the open entity: the target followed by its aliases, with
 * missing entries dropped. Outside the group view this is just `[entityRecord]`.
 */
export const getEntityGroupRecords = <T>(
  entityRecord: T | null | undefined,
  aliasRecords: readonly T[] | undefined
): T[] => [entityRecord, ...(aliasRecords ?? [])].filter((record): record is T => record != null);

/**
 * Entity Store ids of a resolution group, target first then aliases, de-duplicated and without
 * blanks. Intended for APIs that accept `entity_ids`.
 */
export const getEntityGroupIds = (
  entityId: string | null | undefined,
  aliasRecords: readonly { entity?: { id?: string } }[] | undefined
): string[] =>
  Array.from(
    new Set(
      [entityId, ...(aliasRecords ?? []).map((record) => record.entity?.id)].filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      )
    )
  );

/**
 * Combines per-record identity filters into one query: a single filter is returned as is (so
 * single-entity callers keep their existing query shape), several are OR-ed in a `bool.should`.
 * Records that yield no filter are skipped; `undefined` when none does.
 */
export const combineEntityGroupFilters = <T>(
  records: readonly T[],
  buildFilter: (record: T) => QueryDslQueryContainer | undefined
): QueryDslQueryContainer | undefined => {
  const filters = records.flatMap((record) => {
    const filter = buildFilter(record);
    return filter ? [filter] : [];
  });
  if (filters.length === 0) {
    return undefined;
  }
  if (filters.length === 1) {
    return filters[0];
  }
  return { bool: { should: filters, minimum_should_match: 1 } };
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toValueArray = (value: unknown): unknown[] => {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const dedupe = (values: unknown[]): unknown[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = isPlainRecord(value) ? JSON.stringify(value) : `${typeof value}:${String(value)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const unionValues = (target: unknown, source: unknown): unknown => {
  if (isPlainRecord(target) && isPlainRecord(source)) {
    const merged: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
      merged[key] = key in merged ? unionValues(merged[key], value) : value;
    }
    return merged;
  }
  if (target === undefined) {
    return source;
  }
  if (source === undefined) {
    return target;
  }
  const values = dedupe([...toValueArray(target), ...toValueArray(source)]);
  // Two scalars that agree stay a scalar; anything else (disagreement or an array on either
  // side) becomes the union array.
  return !Array.isArray(target) && !Array.isArray(source) && values.length === 1
    ? values[0]
    : values;
};

/**
 * Merges the alias records' attributes into the target's observed details for the group view.
 * Nested objects merge key by key; scalars that disagree between records become a de-duplicated
 * array instead of one record winning. Returns `details` untouched when there are no aliases.
 */
export const mergeEntityGroupDetails = <T extends object>(
  details: T,
  aliasRecords: readonly object[] | undefined
): T => {
  if (!aliasRecords?.length) {
    return details;
  }
  return aliasRecords.reduce<T>((merged, record) => unionValues(merged, record) as T, details);
};

interface LifecycleRecord {
  entity?: { lifecycle?: { first_seen?: string; last_seen?: string; last_activity?: string } };
}

const getRecordFirstSeen = (record: LifecycleRecord): string | undefined =>
  record.entity?.lifecycle?.first_seen;

const getRecordLastSeen = (record: LifecycleRecord): string | undefined =>
  record.entity?.lifecycle?.last_activity ?? record.entity?.lifecycle?.last_seen;

const isEarlier = (candidate: string, current: string | null): boolean =>
  current === null || Date.parse(candidate) < Date.parse(current);

const isLater = (candidate: string, current: string | null): boolean =>
  current === null || Date.parse(candidate) > Date.parse(current);

/**
 * Earliest first-seen and latest last-seen across the records (same lifecycle fields the single
 * entity view reads), so the group's activity window spans every member. `null` when unknown.
 */
export const getEntityGroupLifecycle = (
  records: ReadonlyArray<LifecycleRecord>
): { firstSeen: string | null; lastSeen: string | null } => {
  let firstSeen: string | null = null;
  let lastSeen: string | null = null;
  for (const record of records) {
    const recordFirstSeen = getRecordFirstSeen(record);
    if (recordFirstSeen && isEarlier(recordFirstSeen, firstSeen)) {
      firstSeen = recordFirstSeen;
    }
    const recordLastSeen = getRecordLastSeen(record);
    if (recordLastSeen && isLater(recordLastSeen, lastSeen)) {
      lastSeen = recordLastSeen;
    }
  }
  return { firstSeen, lastSeen };
};

/** De-duplicated `entity.source` values across the records, preserving first-seen order. */
export const getUnionEntitySources = (records: ReadonlyArray<Pick<Entity, 'entity'>>): string[] => {
  const seen = new Set<string>();
  for (const record of records) {
    for (const source of toEntitySourceArray(record.entity?.source)) {
      seen.add(source);
    }
  }
  return Array.from(seen);
};
