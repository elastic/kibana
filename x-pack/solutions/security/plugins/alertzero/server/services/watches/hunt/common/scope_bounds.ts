/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoveredDataset } from './discover_hunt_datasets';

/**
 * Bounds on what a list of index targets may hand a search. `_search` and `_count` receive
 * the target list in the request path, and Elasticsearch's default initial-line limit is
 * 4 KB, so both the entry count and the serialized length are capped. A list that does not
 * fit collapses first onto per-dataset patterns, then onto one wildcard pair per matched
 * vendor, which still covers only the matched vendors.
 */
export const MAX_SCOPE_TARGETS = 64;
/** Unencoded length; the client percent-encodes the separating commas, so this stays at half the limit. */
export const MAX_SCOPE_TARGET_CHARS = 2048;

export const fitsRequestPath = (targets: string[]): boolean =>
  targets.length <= MAX_SCOPE_TARGETS && targets.join(',').length <= MAX_SCOPE_TARGET_CHARS;

/**
 * Two wildcards per matched vendor token, one for each character that can follow
 * the token in a dataset name: `logs-cisco_asa.*` for its streams and
 * `logs-cisco_asa-*` for a dataset that is the token alone. The full token is kept
 * on purpose: cutting it at `_` would turn a `cisco_asa` match into `cisco_*` and
 * pull unmatched `cisco_ise` streams (or `elastic_agent`, for an `elastic` match)
 * into the hit bar. Far fewer targets than the dataset list; sibling isolation
 * within a vendor token is given up, which is why the scope reads as degraded.
 */
export const vendorWildcards = (
  matches: Array<Pick<DiscoveredDataset, 'index_pattern' | 'vendor'>>
): string[] =>
  Array.from(
    new Set(
      matches.flatMap((match) => {
        const type = match.index_pattern.split('-')[0];
        return ['.', '-'].map((separator) => `${type}-${match.vendor}${separator}*`);
      })
    )
  );
