/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIndexScopeEntry } from './remote_cluster';

/** Elastic Defend events the FP/TP check reads. Local, and on each remote alias. */
export const ENDPOINT_EVENTS_INDEX = 'logs-endpoint.events.*';

/** Bound for the comma-separated target returned to the search step. */
export const ENDPOINT_EVENT_INDICES_MAX_LENGTH = 4096;

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
 * True when every index matching `logs-endpoint.events.*` also matches `pattern`.
 * `logs-*` does. `logs-endpoint.events.network-*` does not.
 */
const coversAllEndpointEvents = (pattern: string): boolean =>
  globMatches(pattern, ENDPOINT_EVENTS_INDEX);

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
  `${targets.join(',')},${next}`.length <= ENDPOINT_EVENT_INDICES_MAX_LENGTH;

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

interface EndpointExclusion {
  cluster: string;
  /** Pattern after `-cluster:`. Full covers use the endpoint pattern; narrower ones stay as written. */
  index: string;
  coversAll: boolean;
}

/**
 * Search target for the FP/TP raw-event check. Always the local endpoint pattern.
 * Each positive cluster alias in the space's default data view adds
 * `{alias}:logs-endpoint.events.*`. A remote exclusion that covers every endpoint
 * event does not add that alias; it is rewritten as `-cluster:logs-endpoint.events.*`
 * so a wildcard include cannot search that cluster. A narrower exclusion is passed
 * through as `-cluster:<index>` and the cluster stays in the search. An exclusion
 * that does not fit in the target takes its positive pattern back out, so the
 * search cannot read events the space excluded. Local exclusions, and ES|QL mode
 * prefixes (`_any:`, `_remote:`, `_coordinator:`), add nothing. The data view's own
 * streams are not searched: this check only reads endpoint fields.
 */
export const endpointEventIndices = (patterns: readonly string[]): string => {
  const targets = [ENDPOINT_EVENTS_INDEX];
  const included = new Set<string>();
  const excluded: EndpointExclusion[] = [];
  const list = Array.isArray(patterns) ? patterns.slice(0, MAX_PATTERNS) : [];

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const entry = raw.trim();
    if (entry.length === 0 || entry.length > MAX_PATTERN_LENGTH) continue;

    const { exclude, cluster, index } = parseIndexScopeEntry(entry);
    if (cluster === undefined || cluster.startsWith('_') || !CLUSTER_ALIAS.test(cluster)) continue;

    // A positive entry names a cluster the space searches, whatever stream it names.
    // An exclusion is kept only when it can match an endpoint event.
    if (exclude) {
      if (!globsOverlap(index, ENDPOINT_EVENTS_INDEX)) continue;
      const coversAll = coversAllEndpointEvents(index);
      const emitted = coversAll ? ENDPOINT_EVENTS_INDEX : index;
      if (!excluded.some((item) => item.cluster === cluster && item.index === emitted)) {
        excluded.push({ cluster, index: emitted, coversAll });
      }
      continue;
    }
    if (included.has(cluster)) continue;
    included.add(cluster);
  }

  for (const cluster of included) {
    const fullyExcluded = excluded.some(
      (exclusion) => exclusion.coversAll && exclusionCoversCluster(exclusion.cluster, cluster)
    );
    const next = `${cluster}:${ENDPOINT_EVENTS_INDEX}`;
    if (fullyExcluded || !fits(targets, next)) continue;
    targets.push(next);
  }
  for (const exclusion of excluded) {
    const next = `-${exclusion.cluster}:${exclusion.index}`;
    if (fits(targets, next)) {
      targets.push(next);
      continue;
    }
    for (let index = targets.length - 1; index >= 1; index--) {
      const target = targets[index];
      if (target.startsWith('-') || !target.includes(':')) continue;
      const cluster = target.slice(0, target.indexOf(':'));
      if (positiveWouldSearch(cluster, exclusion.cluster)) targets.splice(index, 1);
    }
    if (fits(targets, next)) targets.push(next);
  }

  return targets.join(',');
};
