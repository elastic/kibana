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

const escapeRegExpLiteral = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compiles an Elasticsearch-style glob, where `*` is the only wildcard, to an anchored RegExp. */
const globMatches = (pattern: string, value: string): boolean =>
  new RegExp(`^${pattern.split('*').map(escapeRegExpLiteral).join('.*')}$`).test(value);

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

const appendTarget = (targets: string[], next: string): void => {
  if (`${targets.join(',')},${next}`.length > ENDPOINT_EVENT_INDICES_MAX_LENGTH) return;
  targets.push(next);
};

/**
 * Search target for the FP/TP raw-event check. Always the local endpoint pattern.
 * Each positive cluster alias in the space's default data view adds
 * `{alias}:logs-endpoint.events.*`. A remote exclusion whose index covers endpoint
 * events does not add an alias; it is rewritten as `-cluster:logs-endpoint.events.*`
 * so a wildcard include cannot search that cluster. Local exclusions, and ES|QL
 * mode prefixes (`_any:`, `_remote:`, `_coordinator:`), add nothing. The data
 * view's own streams are not searched: this check only reads endpoint fields.
 */
export const endpointEventIndices = (patterns: readonly string[]): string => {
  const targets = [ENDPOINT_EVENTS_INDEX];
  const included = new Set<string>();
  const excluded: string[] = [];
  const list = Array.isArray(patterns) ? patterns.slice(0, MAX_PATTERNS) : [];

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const entry = raw.trim();
    if (entry.length === 0 || entry.length > MAX_PATTERN_LENGTH) continue;

    const { exclude, cluster, index } = parseIndexScopeEntry(entry);
    if (cluster === undefined || cluster.startsWith('_') || !CLUSTER_ALIAS.test(cluster)) continue;

    // A positive entry names a cluster the space searches, whatever stream it names.
    // An exclusion drops endpoint events only when its own pattern covers them.
    if (exclude) {
      if (!globsOverlap(index, ENDPOINT_EVENTS_INDEX)) continue;
      if (!excluded.includes(cluster)) excluded.push(cluster);
      continue;
    }
    if (included.has(cluster)) continue;
    included.add(cluster);
  }

  for (const cluster of included) {
    if (excluded.some((exclusion) => exclusionCoversCluster(exclusion, cluster))) continue;
    appendTarget(targets, `${cluster}:${ENDPOINT_EVENTS_INDEX}`);
  }
  for (const cluster of excluded) {
    appendTarget(targets, `-${cluster}:${ENDPOINT_EVENTS_INDEX}`);
  }

  return targets.join(',');
};
