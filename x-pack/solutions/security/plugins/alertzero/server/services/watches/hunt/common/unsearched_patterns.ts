/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIncompleteness, HuntScope } from '@kbn/alertzero-common';
import {
  joinRemoteCluster,
  parseIndexScopeEntry,
  stripBackingPrefix,
} from '../../../../../common/remote_cluster';
import { codeList } from './build_hunt_narrative';
import { buildMatchesRequired } from './matches_required';

/**
 * Longest `index_not_searched` detail a run reports. Packaging renders a detail up to this
 * length whole, so the names and the "and N more" count are never cut off the coverage line.
 */
export const MAX_UNSEARCHED_DETAIL_CHARS = 450;
const MAX_UNSEARCHED_NAMES = 10;
/** Elasticsearch caps an index name at 255 bytes, so a longer entry is shown cut. */
const MAX_SHOWN_NAME_CHARS = 255;

/**
 * The `index_not_searched` gap detail: as many names as fit the bound, ten at most, with the
 * rest counted. One name always fits, since a name is shown at 255 characters at most.
 */
export const describeUnsearched = (names: string[]): string => {
  const shownNames = names.map((name) =>
    name.length > MAX_SHOWN_NAME_CHARS ? `${name.slice(0, MAX_SHOWN_NAME_CHARS - 1)}…` : name
  );
  const sentence = (shown: number) =>
    `The default data view names ${codeList(
      shownNames,
      shown
    )}, which this hunt could not read (no read access, not found, or closed), so the hunt never searched there.`;
  let shown = Math.min(names.length, MAX_UNSEARCHED_NAMES);
  while (shown > 1 && sentence(shown).length > MAX_UNSEARCHED_DETAIL_CHARS) shown -= 1;
  return sentence(shown);
};

/**
 * Whether Elasticsearch would search `name` for this ordered list of entries: each entry that
 * matches it either includes it or, for an exclusion, removes it again, so the last matching
 * entry decides (`['logs-*', '-custom-*', 'custom-1']` searches `custom-1`, and
 * `['custom-1', '-custom-*']` does not).
 */
const isIncludedByUniverse = (name: string, universe: string[]): boolean => {
  // The name comes from the list's own positive entries, so it starts out included.
  let included = true;
  for (const entry of universe) {
    const { exclude, ...target } = parseIndexScopeEntry(entry);
    if (buildMatchesRequired([stripBackingPrefix(joinRemoteCluster(target))])(name)) {
      included = !exclude;
    }
  }
  return included;
};

/**
 * The names a scope dropped from the search: entries of `missing` that are absent from
 * `index_patterns` and that the data view still asks to search once its exclusions are applied
 * in order (a name the data view excludes itself resolved nothing by design). `universe` is the
 * ordered default data view the scope was resolved from. Meaningful only for a scope that is
 * not blocked. A dropped name is always local, so cross-project search does not change the
 * answer.
 */
export const unsearchedPatterns = (
  scope: Pick<HuntScope, 'index_patterns' | 'missing'>,
  universe: string[]
): string[] => {
  const kept = new Set(scope.index_patterns);
  return Array.from(new Set(scope.missing))
    .filter((entry) => !kept.has(entry))
    .filter((entry) => isIncludedByUniverse(stripBackingPrefix(entry), universe));
};

/**
 * The gap a run reports for the names its scope dropped: one final `index_not_searched` entry
 * naming them, or nothing when the scope dropped none.
 */
export const unsearchedGaps = (
  scope: Pick<HuntScope, 'index_patterns' | 'missing'>,
  universe: string[]
): HuntIncompleteness[] => {
  const unsearched = unsearchedPatterns(scope, universe);
  return unsearched.length > 0
    ? [{ reason: 'index_not_searched', detail: describeUnsearched(unsearched) }]
    : [];
};
