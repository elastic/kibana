/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriticalityLevels } from '../asset_criticality/constants';

/** The fields of an Entity Store record that make up a group's values. */
export interface ResolutionGroupMemberRecord {
  '@timestamp'?: string;
  asset?: { criticality?: string | null };
  entity?: {
    source?: string | string[];
    attributes?: { watchlists?: string | string[] };
    lifecycle?: { first_seen?: string; last_activity?: string };
  };
}

export interface ResolutionGroupValues {
  /** The highest criticality of the members, if any has one. */
  criticality?: string;
  sources: string[];
  watchlists: string[];
  firstSeen?: string;
  /** The latest `entity.lifecycle.last_activity`. */
  lastActivity?: string;
  /** The latest `@timestamp`, which is what the entities page shows as last seen. */
  lastSeen?: string;
}

/** Criticality levels from the highest:. */
export const CRITICALITY_LEVELS: readonly string[] = Object.values(CriticalityLevels);

/** The sort rank of a criticality: the highest level ranks highest, an unknown or missing one 0. */
export const getCriticalityRank = (level: unknown): number => {
  const index = CRITICALITY_LEVELS.findIndex((criticality) => criticality === level);
  return index === -1 ? 0 : CRITICALITY_LEVELS.length - index;
};

const toList = (value: string | string[] | undefined): string[] =>
  value === undefined ? [] : [value].flat();

const earliest = (values: Array<string | undefined>): string | undefined =>
  values.reduce<string | undefined>(
    (min, value) => (value && (min === undefined || value < min) ? value : min),
    undefined
  );

const latest = (values: Array<string | undefined>): string | undefined =>
  values.reduce<string | undefined>(
    (max, value) => (value && (max === undefined || value > max) ? value : max),
    undefined
  );

/**
 * A resolution group's values from the records of its members (the primary and its aliases), as the
 * entities page shows them: the highest criticality, every source and watchlist, the earliest first
 * seen and the latest last seen.
 */
export const mergeResolutionGroupValues = (
  records: readonly ResolutionGroupMemberRecord[]
): ResolutionGroupValues => ({
  criticality: records.reduce<string | undefined>((highest, { asset }) => {
    const level = asset?.criticality ?? undefined;
    return level && getCriticalityRank(level) > getCriticalityRank(highest) ? level : highest;
  }, undefined),
  sources: [...new Set(records.flatMap(({ entity }) => toList(entity?.source)))],
  watchlists: [...new Set(records.flatMap(({ entity }) => toList(entity?.attributes?.watchlists)))],
  firstSeen: earliest(records.map(({ entity }) => entity?.lifecycle?.first_seen)),
  lastActivity: latest(records.map(({ entity }) => entity?.lifecycle?.last_activity)),
  lastSeen: latest(records.map((record) => record['@timestamp'])),
});
