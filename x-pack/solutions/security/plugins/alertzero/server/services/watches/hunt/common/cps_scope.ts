/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIndexScopeEntry } from '../../../../../common/remote_cluster';

/**
 * Under cross-project search an unqualified entry reaches every project the space routes to,
 * where cross-cluster search keeps it on the local cluster. The scope guards read an
 * unqualified entry the cross-cluster way, so this spells the wider reach out: each unqualified
 * entry is kept and gains a `*:` twin (`logs-*` adds `*:logs-*`, `-logs-x*` adds
 * `*:-logs-x*`). Entries that already name a cluster pass through unchanged. Guards then admit
 * a linked project's `<alias>:logs-…` the same way they admit the local one, and exclusions
 * reach it too.
 */
export const withLinkedProjectTwins = (patterns: string[]): string[] => {
  const expanded = patterns.flatMap((pattern) => {
    const { exclude, cluster, index } = parseIndexScopeEntry(pattern);
    if (cluster !== undefined) return [pattern];
    return [pattern, `*:${exclude ? '-' : ''}${index}`];
  });
  return [...new Set(expanded)];
};

/** The patterns the guards compare against: widened when cross-project search is on. */
export const scopeGuardPatterns = (patterns: string[], crossProjectSearch: boolean): string[] =>
  crossProjectSearch ? withLinkedProjectTwins(patterns) : patterns;
