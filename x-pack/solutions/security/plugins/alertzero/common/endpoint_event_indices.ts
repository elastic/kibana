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
 * Search target for the FP/TP raw-event check. Always the local endpoint pattern.
 * Each positive cluster alias in the space's default data view adds
 * `{alias}:logs-endpoint.events.*`. Exclusions, local-only patterns, and ES|QL
 * mode prefixes (`_any:`, `_remote:`, `_coordinator:`) add nothing. The data
 * view's own streams are not searched: this check only reads endpoint fields.
 */
export const endpointEventIndices = (patterns: readonly string[]): string => {
  const targets = [ENDPOINT_EVENTS_INDEX];
  const seen = new Set<string>();
  const list = Array.isArray(patterns) ? patterns.slice(0, MAX_PATTERNS) : [];

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const entry = raw.trim();
    if (entry.length === 0 || entry.length > MAX_PATTERN_LENGTH) continue;

    const { exclude, cluster } = parseIndexScopeEntry(entry);
    if (exclude || cluster === undefined || cluster.startsWith('_')) continue;
    if (!CLUSTER_ALIAS.test(cluster) || seen.has(cluster)) continue;

    const next = `${cluster}:${ENDPOINT_EVENTS_INDEX}`;
    if (`${targets.join(',')},${next}`.length > ENDPOINT_EVENT_INDICES_MAX_LENGTH) continue;
    seen.add(cluster);
    targets.push(next);
  }

  return targets.join(',');
};
