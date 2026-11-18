/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntScope } from '@kbn/alertzero-common';
import {
  isDotPrefixedIndex,
  isIndexExclusion,
  parseIndexScopeEntry,
} from '../../../../../common/remote_cluster';

/** Why a hunt refuses a data view whose every positive entry was skipped by policy. */
export const NO_SEARCHABLE_PATTERN_MESSAGE =
  'The default data view has no pattern this hunt may search: hidden and alerts indices are never searched.';

/**
 * The data view held only hidden or alerts indices, so policy alone left nothing to search.
 * Requires `blocked:empty_universe`: a `blocked:discovery_failed` scope also has empty `missing`
 * and may still carry `policy_skipped`, which is not the same failure.
 */
export const isBlockedByPolicyOnly = ({
  resolution,
  policy_skipped: policySkipped = [],
  missing,
}: Pick<HuntScope, 'resolution' | 'policy_skipped' | 'missing'>): boolean =>
  resolution === 'blocked:empty_universe' && policySkipped.length > 0 && missing.length === 0;

/** The default data view split into what a hunt may search and what policy skips. */
export interface HuntUniverse {
  /** Entries a hunt searches: every exclusion, and every positive entry not skipped. */
  patterns: string[];
  /** Positive entries never searched because their index name is dot-prefixed. */
  policySkipped: string[];
}

/**
 * A date-math name carries a timezone colon (`<.alerts-{now/d{yyyy.MM.dd|+12:00}}>`), which
 * `splitRemoteCluster` would read as a cluster separator, so the dot test is made on the text
 * after the `<`, found by the first `<` or `:<`.
 */
const isDotPrefixedEntry = (entry: string): boolean => {
  if (entry.startsWith('<')) return entry.slice(1).startsWith('.');
  const dateMath = entry.indexOf(':<');
  if (dateMath > 0) return entry.slice(dateMath + 2).startsWith('.');
  return isDotPrefixedIndex(entry);
};

/**
 * A whole-cluster exclusion (`-archive:*`) the data view still needs: Elasticsearch rejects one
 * for a cluster no positive entry includes. An entry whose cluster is a wildcard (`*:logs-*`)
 * may include any cluster, so it keeps every such exclusion.
 */
const isOrphanedClusterExclusion = (
  entry: string,
  positives: string[],
  skippedClusters: Set<string>
): boolean => {
  const { exclude, cluster, index } = parseIndexScopeEntry(entry);
  if (!exclude || cluster === undefined || index !== '*' || !skippedClusters.has(cluster)) {
    return false;
  }
  return !positives.some((positive) => {
    const { cluster: included } = parseIndexScopeEntry(positive);
    return included === cluster || included?.includes('*');
  });
};

/**
 * Hidden and alerts indices are never hunted: the worker cannot read them and hit handling
 * already treats a leading dot as "not a telemetry source". Exclusions always stay in
 * `patterns`, since removing one would widen the search.
 */
export const partitionHuntUniverse = (entries: string[]): HuntUniverse => {
  const patterns: string[] = [];
  const policySkipped: string[] = [];
  for (const entry of entries) {
    if (!isIndexExclusion(entry) && isDotPrefixedEntry(entry)) policySkipped.push(entry);
    else patterns.push(entry);
  }
  // Skipping a cluster's only positive entry can strand its whole-cluster exclusion.
  const skippedClusters = new Set(
    policySkipped.flatMap((entry) => parseIndexScopeEntry(entry).cluster ?? [])
  );
  const positives = patterns.filter((entry) => !isIndexExclusion(entry));
  return {
    patterns: patterns.filter(
      (entry) => !isOrphanedClusterExclusion(entry, positives, skippedClusters)
    ),
    policySkipped,
  };
};
