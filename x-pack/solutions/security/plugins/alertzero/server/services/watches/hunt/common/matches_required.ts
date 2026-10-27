/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RemoteClusterName } from '../../../../../common/remote_cluster';
import {
  parseIndexScopeEntry,
  splitRemoteCluster,
  stripBackingPrefix,
} from '../../../../../common/remote_cluster';
import { clusterCovers, compileGlob, exclusionReachesCluster, globsOverlap } from './index_glob';

interface CompiledPattern {
  cluster?: RegExp;
  index: RegExp;
}

const compilePattern = ({ cluster, index }: RemoteClusterName): CompiledPattern => ({
  cluster: cluster === undefined ? undefined : compileGlob(cluster),
  index: compileGlob(index),
});

/**
 * Elasticsearch never expands a local pattern onto a remote cluster, so a local pattern
 * matches only local names and a `<cluster>:` pattern only names on a cluster it globs.
 */
const matchesPattern = ({ cluster, index }: CompiledPattern, name: RemoteClusterName): boolean => {
  if (cluster === undefined) return name.cluster === undefined && index.test(name.index);
  return name.cluster !== undefined && cluster.test(name.cluster) && index.test(name.index);
};

/**
 * Builds a predicate that is true when a concrete `_index` value matches one of
 * the required index patterns. Data-stream backing indices (`.ds-…`, local or
 * `<cluster>:.ds-…`) are stripped to their data-stream name before testing so
 * `logs-aws.*` matches `.ds-logs-aws.cloudtrail-default-2026.09.01-000001`.
 *
 * Exclusion entries are honoured the way Elasticsearch honours them in the search
 * itself: an index is required only if a positive pattern matches it and no
 * exclusion does. Local (`-logs-elastic_agent*`), remote (`remote:-logs-elastic_agent*`)
 * and whole-cluster (`-remote:*`) exclusions all count. A broad hunt scope carries
 * them so the agent-internal streams stay out of both tiers.
 */
export const buildMatchesRequired = (requiredPatterns: string[]): ((index: string) => boolean) => {
  const entries = requiredPatterns.map(parseIndexScopeEntry);
  const positives = entries.filter((entry) => !entry.exclude).map(compilePattern);
  const negatives = entries.filter((entry) => entry.exclude).map(compilePattern);
  return (index: string): boolean => {
    const concrete = splitRemoteCluster(stripBackingPrefix(index));
    return (
      positives.some((pattern) => matchesPattern(pattern, concrete)) &&
      !negatives.some((pattern) => matchesPattern(pattern, concrete))
    );
  };
};

/**
 * Whether a candidate source could resolve to anything an exclusion covers.
 * A concrete candidate is checked exactly. A wildcard candidate is judged by
 * its literal prefix: if that prefix and the exclusion's prefix are compatible
 * (either starts with the other) the two can share a match once Elasticsearch
 * expands the wildcard (`logs-e*` reaches `logs-elastic_agent-default`), so the
 * candidate is treated as overlapping. That is deliberately conservative: a
 * refusal falls back to the matched indices, an acceptance would read excluded
 * streams. Both sides are index parts on the same cluster.
 */
const overlapsExclusion = (rawCandidate: string, exclusion: string): boolean =>
  // The positive check strips `.ds-` so a backing index matches its stream's pattern;
  // the exclusion check has to see the same name, or an explicitly named
  // `.ds-logs-elastic_agent...` backing index would slip past `-logs-elastic_agent*`.
  globsOverlap(stripBackingPrefix(rawCandidate), exclusion);

/**
 * True when `candidate` (a concrete `_index` or a pattern like
 * `logs-aws.cloudtrail-*`) cannot resolve outside `allowedPatterns`.
 *
 * A trailing `*` on the candidate is probed as `x` so `logs-aws.*` covers
 * `logs-aws.cloudtrail-*` but not the broader `logs-*` or an unrelated
 * `.kibana*`. Exclusion entries (`-logs-elastic_agent*`) then veto any
 * candidate whose expansion could touch them, including the positive
 * pattern itself: under a broad scope `logs-*` is not a source, only the
 * narrower patterns Tier 1 actually hit are.
 *
 * A cross-cluster candidate is only covered by allowed patterns whose cluster
 * covers its own (see `clusterCovers`): `infosec_zocalo:logs-aws.*` is covered
 * by `*:logs-*`, while a wildcard-cluster candidate (`*:logs-aws.*`) needs that
 * exact cluster string. A local pattern never reaches a remote cluster, and a
 * cluster the scope does not reach stays refused. A `::` selector
 * (`logs-*::failures`) is never allowed.
 */
export const isIndexPatternAllowed = (candidate: string, allowedPatterns: string[]): boolean => {
  if (!candidate || allowedPatterns.length === 0) return false;
  // A generated exclusion is not a source; only positive entries can be named outright.
  const { exclude, cluster, index } = parseIndexScopeEntry(candidate);
  if (exclude) return false;
  if (index === '' || index === '*' || index.includes(':')) return false;

  const entries = allowedPatterns.map(parseIndexScopeEntry);
  const positives = entries
    .filter((entry) => !entry.exclude && clusterCovers(entry.cluster, cluster))
    .map((entry) => entry.index);
  const exclusions = entries
    .filter((entry) => entry.exclude && exclusionReachesCluster(entry.cluster, cluster))
    .map((entry) => entry.index);
  const contained =
    positives.includes(index) || buildMatchesRequired(positives)(index.replace(/\*/g, 'x'));
  return contained && !exclusions.some((exclusion) => overlapsExclusion(index, exclusion));
};
