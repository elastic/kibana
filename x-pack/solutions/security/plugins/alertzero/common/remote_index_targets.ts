/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIndexScopeEntry } from './remote_cluster';

/** Bound for the comma-separated target returned to a search step. */
export const REMOTE_INDEX_TARGETS_MAX_LENGTH = 4096;

/**
 * The longest target, URL-encoded, that a search can carry. The search step encodes the target into
 * the request path, so every `,` and `:` takes three characters. Elasticsearch rejects a request
 * line over 4096 characters with `too_long_http_line_exception`, and that line also holds the
 * method, `/_search`, and the query string, about 80 characters. A target past the limit fails the
 * whole search, which hides the clusters that would have fit.
 */
const MAX_ENCODED_TARGET_LENGTH = 3900;

const MAX_PATTERNS = 200;
const MAX_PATTERN_LENGTH = 1024;

// A cluster alias, including a wildcard such as `remote_*` or a bare `*`.
const CLUSTER_ALIAS = /^(?:\*|[A-Za-z0-9][A-Za-z0-9_.*-]*)$/;

/**
 * Whether `value` matches an Elasticsearch glob. `*` is the only wildcard, and a
 * run of them is one `*`. The scan moves forward only, so a long run of wildcards
 * cannot backtrack.
 */
const globMatches = (pattern: string, value: string): boolean => {
  const parts = pattern.replace(/\*+/g, '*').split('*');
  if (parts.length === 1) return parts[0] === value;

  const head = parts[0];
  const tail = parts[parts.length - 1];
  if (!value.startsWith(head) || !value.endsWith(tail)) return false;

  const end = value.length - tail.length;
  let from = head.length;
  if (from > end) return false;

  for (let index = 1; index < parts.length - 1; index++) {
    const part = parts[index];
    if (part.length === 0) continue;
    const at = value.indexOf(part, from);
    if (at < 0 || at + part.length > end) return false;
    from = at + part.length;
  }
  return true;
};

/** Whether two `*`-only globs can name the same index. A concrete value is tested exactly. */
const globsOverlap = (left: string, right: string): boolean => {
  if (!left.includes('*')) return globMatches(right, left);
  if (!right.includes('*')) return globMatches(left, right);
  const leftPrefix = left.split('*')[0];
  const rightPrefix = right.split('*')[0];
  return leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix);
};

/**
 * A concrete cluster is covered when the exclusion glob matches it. A wildcard
 * cluster is covered only by that same pattern, so `remote_*` is not dropped
 * because one concrete cluster under it was excluded.
 */
const exclusionCoversCluster = (exclusionCluster: string, candidate: string): boolean =>
  candidate.includes('*')
    ? exclusionCluster === candidate
    : globMatches(exclusionCluster, candidate);

const fits = (targets: readonly string[], next: string): boolean =>
  encodeURIComponent(`${targets.join(',')},${next}`).length <= MAX_ENCODED_TARGET_LENGTH;

/**
 * Whether a positive cluster pattern would still search the excluded cluster.
 * Two wildcards overlap by prefix, so `*` and `remote_*` are dropped when
 * `-remote_a*` does not fit. An exact match is not required.
 */
const positiveWouldSearch = (positiveCluster: string, exclusionCluster: string): boolean => {
  if (positiveCluster.includes('*') && exclusionCluster.includes('*')) {
    return globsOverlap(positiveCluster, exclusionCluster);
  }
  if (positiveCluster.includes('*')) return globMatches(positiveCluster, exclusionCluster);
  return exclusionCoversCluster(exclusionCluster, positiveCluster);
};

interface RemoteExclusion {
  cluster: string;
  /** Pattern after `-cluster:`. Full covers use the local target; narrower ones stay as written. */
  index: string;
  /** True when the exclusion matches every index the local target `index` matches. */
  coversAll: boolean;
}

export interface RemoteIndexTargets {
  /** Comma-separated search target: the local patterns, then one entry per cluster and pattern. */
  index: string;
  /** The cluster aliases the target searches, as written in the data view. */
  clusters: string[];
  /**
   * True when the target leaves out remote clusters or patterns the data view names. Either the
   * data view could not be used in full (it is not a list, it is longer than the helper reads, or an
   * entry is longer than the helper reads) and the target is the local patterns only, or the length
   * cap dropped an include, or took one back out to fit its exclusion. A cluster the data view
   * excludes is not missing. A data view that names no cluster is complete.
   */
  incomplete: boolean;
}

/**
 * Search target for a read of `localTargets` that also reaches the remote clusters the space's
 * default data view names. Always the local patterns first. Each positive cluster alias in the
 * data view adds `{alias}:{pattern}` for every local pattern. A remote exclusion that covers
 * every index a pattern matches does not add that alias for the pattern. It is written out as
 * `-cluster:{pattern}` only when a wildcard include (`*:` or `remote_*:`) would otherwise search
 * that cluster. A narrower exclusion is passed through as `-cluster:<index>` and the cluster stays
 * in the search. An exclusion that nothing in the target would search is left out: Elasticsearch
 * fails the whole request when an alias in it is not a configured remote, so an alias the data view
 * still names but the deployment no longer has must not reach the target without need.
 *
 * Elasticsearch counts a `-cluster:<index>` entry as including that cluster, so an exclusion that
 * is written out still contacts the cluster, with no shards to search. The data it returns is
 * correct. `-cluster:*` would avoid the contact, but Elasticsearch rejects it unless an earlier
 * entry included the cluster.
 *
 * An exclusion that does not fit in the target takes its positive patterns back out, so the search
 * cannot read events the space excluded. Local exclusions, and ES|QL mode prefixes (`_any:`,
 * `_remote:`, `_coordinator:`), add nothing. The data view's own streams are not searched: a caller
 * reads only the patterns it names.
 *
 * A data view the helper cannot read in full searches the local patterns only and is reported as
 * `incomplete`. Dropping the tail of a long list, or one over-long entry, could drop an exclusion
 * while keeping the wildcard include it was meant to limit, so the search would read a cluster the
 * space excluded. A target that hits the length cap is also `incomplete`: an include that does not
 * fit is left out, and an include is taken back out when its exclusion does not fit. Events on
 * those clusters are not read, which a caller must not mistake for a complete read.
 */
export const remoteIndexTargets = (
  dataViewPatterns: readonly string[],
  localTargets: readonly string[]
): RemoteIndexTargets => {
  const locals = [...new Set(localTargets.filter((target) => target.length > 0))];
  const result: string[] = [...locals];
  const included = new Set<string>();
  const excluded: RemoteExclusion[] = [];
  let leftOut = false;
  const localOnly = (): RemoteIndexTargets => ({
    index: locals.join(','),
    clusters: [],
    incomplete: true,
  });

  if (!Array.isArray(dataViewPatterns) || dataViewPatterns.length > MAX_PATTERNS) {
    return localOnly();
  }

  for (const raw of dataViewPatterns) {
    if (typeof raw !== 'string') continue;
    const entry = raw.trim();
    if (entry.length === 0) continue;
    if (entry.length > MAX_PATTERN_LENGTH) return localOnly();

    const { exclude, cluster, index } = parseIndexScopeEntry(entry);
    if (cluster === undefined || cluster.startsWith('_') || !CLUSTER_ALIAS.test(cluster)) continue;

    // A positive entry names a cluster the space searches, whatever stream it names.
    // An exclusion is kept only for the local patterns it can match.
    if (!exclude) {
      included.add(cluster);
      continue;
    }
    for (const target of locals) {
      if (!globsOverlap(index, target)) continue;
      const coversAll = globMatches(index, target);
      const emitted = coversAll ? target : index;
      if (!excluded.some((item) => item.cluster === cluster && item.index === emitted)) {
        excluded.push({ cluster, index: emitted, coversAll });
      }
    }
  }

  for (const cluster of included) {
    for (const target of locals) {
      const fullyExcluded = excluded.some(
        (exclusion) =>
          exclusion.coversAll &&
          exclusion.index === target &&
          exclusionCoversCluster(exclusion.cluster, cluster)
      );
      const next = `${cluster}:${target}`;
      if (fullyExcluded) continue;
      if (!fits(result, next)) {
        leftOut = true;
        continue;
      }
      result.push(next);
    }
  }
  const searchesExcluded = (exclusion: RemoteExclusion): boolean =>
    result.slice(locals.length).some((entry) => {
      if (entry.startsWith('-')) return false;
      const separator = entry.indexOf(':');
      return (
        positiveWouldSearch(entry.slice(0, separator), exclusion.cluster) &&
        globsOverlap(entry.slice(separator + 1), exclusion.index)
      );
    });

  for (const exclusion of excluded) {
    if (!searchesExcluded(exclusion)) continue;
    const next = `-${exclusion.cluster}:${exclusion.index}`;
    if (fits(result, next)) {
      result.push(next);
      continue;
    }
    for (let position = result.length - 1; position >= locals.length; position--) {
      const entry = result[position];
      if (entry.startsWith('-')) continue;
      const separator = entry.indexOf(':');
      const cluster = entry.slice(0, separator);
      const target = entry.slice(separator + 1);
      if (
        positiveWouldSearch(cluster, exclusion.cluster) &&
        globsOverlap(target, exclusion.index)
      ) {
        result.splice(position, 1);
        leftOut = true;
      }
    }
    if (fits(result, next)) result.push(next);
  }

  const clusters = new Set<string>();
  for (const entry of result.slice(locals.length)) {
    if (!entry.startsWith('-')) clusters.add(entry.slice(0, entry.indexOf(':')));
  }
  return { index: result.join(','), clusters: [...clusters], incomplete: leftOut };
};
