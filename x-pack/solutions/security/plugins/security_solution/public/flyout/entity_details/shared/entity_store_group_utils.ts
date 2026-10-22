/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Entity } from '../../../../common/api/entity_analytics';
import { getCriticalityRank } from '../../../../common/entity_analytics/asset_criticality/constants';
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
 *
 * `aliasCount` is the store's total number of aliases; pass it so the count stays correct when
 * `aliasRecords` was truncated to the member cap. Falls back to the loaded records otherwise.
 */
export const getResolvedFromRecordCount = (
  aliasRecords: readonly unknown[] | undefined,
  aliasCount?: number
): number | undefined => {
  if (!isEntityGroupView(aliasRecords)) {
    return undefined;
  }
  return Math.max(aliasCount ?? 0, aliasRecords.length) + 1;
};

/**
 * Most severe assigned asset criticality across the records, or `undefined` when none is assigned
 * (callers render `undefined` as the "unassigned" badge).
 */
export const getMaxCriticality = (
  records: ReadonlyArray<Pick<Entity, 'asset'>>
): CriticalityLevelWithUnassigned | undefined =>
  records.reduce<CriticalityLevelWithUnassigned | undefined>((max, { asset }) => {
    const level = asset?.criticality as CriticalityLevelWithUnassigned | undefined;
    return getCriticalityRank(level) > getCriticalityRank(max) ? level : max;
  }, undefined);

/** Watchlist ids stored on a single record under `entity.attributes.watchlists`. */
export const getWatchlistIds = (record: Pick<Entity, 'entity'>): string[] => {
  const attributes = (record.entity as Record<string, unknown> | undefined)?.attributes as
    | Record<string, unknown>
    | undefined;
  const watchlists = attributes?.watchlists;
  // A single watchlist membership is serialized as a bare string rather than a one-element array.
  const ids = Array.isArray(watchlists) ? watchlists : [watchlists];
  return ids.filter((id): id is string => typeof id === 'string' && id !== '');
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
 * missing entries dropped and repeated records (same reference) kept once, at their first position.
 * Outside the group view this is just `[entityRecord]`.
 */
export const getEntityGroupRecords = <T>(
  entityRecord: T | null | undefined,
  aliasRecords: readonly T[] | undefined
): T[] => {
  const records = [entityRecord, ...(aliasRecords ?? [])].filter(
    (record): record is T => record != null
  );
  return Array.from(new Set(records));
};

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

const sortObjectKeys = (_key: string, value: unknown): unknown =>
  isPlainRecord(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, value[key]])
      )
    : value;

/** Structural identity of a value: ignores object key order, keeps array order and value types. */
const toDedupeKey = (value: unknown): string =>
  JSON.stringify(value, sortObjectKeys) ?? String(value);

const dedupe = (values: unknown[]): unknown[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = toDedupeKey(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** Sets an own data property, so keys such as `__proto__` stay plain data instead of changing the prototype. */
const setOwnProperty = (target: Record<string, unknown>, key: string, value: unknown): void => {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
};

const unionValues = (target: unknown, source: unknown): unknown => {
  if (isPlainRecord(target) && isPlainRecord(source)) {
    const merged: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(source)) {
      setOwnProperty(
        merged,
        key,
        Object.hasOwn(merged, key) ? unionValues(merged[key], value) : value
      );
    }
    return merged;
  }
  // `null` is as good as absent: it must not turn a scalar into `[null, value]`.
  if (source == null) {
    return target;
  }
  if (target == null) {
    return source;
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
 * array instead of one record winning; `null`/`undefined` values never contribute. Alias entries
 * that are not plain objects are ignored. Returns `details` untouched when nothing is merged.
 */
export const mergeEntityGroupDetails = <T extends object>(
  details: T,
  aliasRecords: readonly object[] | undefined
): T => {
  const records = aliasRecords?.filter(isPlainRecord) ?? [];
  if (!isPlainRecord(details) || records.length === 0) {
    return details;
  }
  return records.reduce<T>((merged, record) => unionValues(merged, record) as T, details);
};

interface LifecycleRecord {
  entity?: { lifecycle?: { first_seen?: string; last_seen?: string; last_activity?: string } };
}

interface ParsedTimestamp {
  value: string;
  epoch: number;
}

/** The first non-empty value that parses as a date; malformed or empty values are skipped. */
const parseFirstValidTimestamp = (
  ...values: Array<string | undefined>
): ParsedTimestamp | undefined => {
  for (const value of values) {
    if (value) {
      const epoch = Date.parse(value);
      if (!Number.isNaN(epoch)) {
        return { value, epoch };
      }
    }
  }
  return undefined;
};

/**
 * Earliest first-seen and latest last-seen across the records (same lifecycle fields the single
 * entity view reads), so the group's activity window spans every member. A record's last seen is
 * its `last_activity`, falling back to `last_seen`. Malformed or empty timestamps are ignored;
 * `null` when no record has a valid one.
 */
export const getEntityGroupLifecycle = (
  records: ReadonlyArray<LifecycleRecord>
): { firstSeen: string | null; lastSeen: string | null } => {
  let firstSeen: ParsedTimestamp | undefined;
  let lastSeen: ParsedTimestamp | undefined;
  for (const record of records) {
    const { first_seen, last_seen, last_activity } = record.entity?.lifecycle ?? {};
    const recordFirstSeen = parseFirstValidTimestamp(first_seen);
    if (recordFirstSeen && (!firstSeen || recordFirstSeen.epoch < firstSeen.epoch)) {
      firstSeen = recordFirstSeen;
    }
    const recordLastSeen = parseFirstValidTimestamp(last_activity, last_seen);
    if (recordLastSeen && (!lastSeen || recordLastSeen.epoch > lastSeen.epoch)) {
      lastSeen = recordLastSeen;
    }
  }
  return { firstSeen: firstSeen?.value ?? null, lastSeen: lastSeen?.value ?? null };
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
