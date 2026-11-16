/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDotPrefixedIndex, isIndexExclusion } from '../../../../../common/remote_cluster';

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
  return { patterns, policySkipped };
};
