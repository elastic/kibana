/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
