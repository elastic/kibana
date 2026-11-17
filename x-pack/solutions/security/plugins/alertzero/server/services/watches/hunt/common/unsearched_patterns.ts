/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntScope } from '@kbn/alertzero-common';
import { isIndexExclusion, stripBackingPrefix } from '../../../../../common/remote_cluster';
import { codeList } from './build_hunt_narrative';
import { scopeGuardPatterns } from './cps_scope';
import { buildMatchesRequired } from './matches_required';

/**
 * Longest `index_not_searched` detail a run reports. Packaging renders a detail up to this
 * length whole, so the names and the "and N more" count are never cut off the coverage line.
 */
export const MAX_UNSEARCHED_DETAIL_CHARS = 450;
const MAX_UNSEARCHED_NAMES = 10;

/**
 * The `index_not_searched` gap detail: as many names as fit the bound, ten at most, with the
 * rest counted. Only a single name too long for the bound can exceed it.
 */
export const describeUnsearched = (names: string[]): string => {
  const sentence = (shown: number) =>
    `The default data view names ${codeList(
      names,
      shown
    )}, which this hunt could not resolve (not readable, or not found), so the hunt never searched there.`;
  let shown = Math.min(names.length, MAX_UNSEARCHED_NAMES);
  while (shown > 1 && sentence(shown).length > MAX_UNSEARCHED_DETAIL_CHARS) shown -= 1;
  return sentence(shown);
};

/**
 * The names a scope dropped from the search: entries of `missing` that are absent from
 * `index_patterns` and that no exclusion entry of the data view covers (a name the data view
 * excludes itself resolved nothing by design). Meaningful only for a scope that is not blocked.
 */
export const unsearchedPatterns = (
  scope: Pick<HuntScope, 'index_patterns' | 'missing'>,
  crossProjectSearch: boolean
): string[] => {
  const exclusionEntries = scope.index_patterns.filter(isIndexExclusion);
  const kept = new Set(scope.index_patterns);
  const dropped = Array.from(new Set(scope.missing)).filter((entry) => !kept.has(entry));
  return dropped.filter((entry) => {
    const bare = stripBackingPrefix(entry);
    // Still matched once the exclusions are applied means nothing excludes it.
    return buildMatchesRequired(
      scopeGuardPatterns([bare, ...exclusionEntries], crossProjectSearch)
    )(bare);
  });
};
