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

const isQualifiedExclusion = (entry: string): boolean => {
  const { exclude, cluster } = parseIndexScopeEntry(entry);
  return exclude && cluster !== undefined;
};

/**
 * Whether an allowlist was widened by `withLinkedProjectTwins`: some unqualified positive entry
 * also appears with its `*:` twin. Such a list reads an unqualified source as reaching every
 * linked project, so the source guard must check that reach too.
 */
export const reachesLinkedProjects = (allowedPatterns: string[]): boolean => {
  const entries = allowedPatterns.map(parseIndexScopeEntry).filter(({ exclude }) => !exclude);
  const local = new Set(
    entries.filter(({ cluster }) => cluster === undefined).map(({ index }) => index)
  );
  return entries.some(({ cluster, index }) => cluster === '*' && local.has(index));
};

/**
 * What Tier 2 may read: the targets, widened to linked projects under cross-project search,
 * with the universe's project-qualified exclusions carried along. A widened `*:logs-aws.*`
 * would otherwise reach a project the universe excludes by name (`linked:-logs-aws.*`), since
 * targets hold positive entries only. Unqualified exclusions are not carried: target selection
 * already applied them, and they hold for the widened twin too. Carrying one with a leading
 * wildcard (`-*elastic-cloud-logs-*`) would also veto every wildcard source, because the source
 * guard judges wildcards by literal prefix. Without cross-project search the targets stand.
 */
export const tier2AllowedIndices = ({
  targets,
  universe,
  crossProjectSearch,
}: {
  targets: string[];
  universe: string[];
  crossProjectSearch: boolean;
}): string[] =>
  crossProjectSearch
    ? withLinkedProjectTwins([...targets, ...universe.filter(isQualifiedExclusion)])
    : targets;

/** The patterns the guards compare against: widened when cross-project search is on. */
export const scopeGuardPatterns = (patterns: string[], crossProjectSearch: boolean): string[] =>
  crossProjectSearch ? withLinkedProjectTwins(patterns) : patterns;
