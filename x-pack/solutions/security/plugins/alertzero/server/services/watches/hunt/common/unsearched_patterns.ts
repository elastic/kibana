/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntIncompleteness, HuntScope } from '@kbn/alertzero-common';
import { isIndexExclusion, stripBackingPrefix } from '../../../../../common/remote_cluster';
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
 * The names a scope dropped from the search: entries of `missing` that are absent from
 * `index_patterns` and that no exclusion entry of the data view covers (a name the data view
 * excludes itself resolved nothing by design). Meaningful only for a scope that is not blocked.
 *
 * A dropped name is always local, so cross-project search does not change the answer. Entry
 * order is not kept on the scope, so an exclusion counts wherever it sits: a name listed again
 * after the exclusion that covers it (which Elasticsearch would search) is not reported.
 */
export const unsearchedPatterns = (
  scope: Pick<HuntScope, 'index_patterns' | 'missing'>
): string[] => {
  const exclusionEntries = scope.index_patterns.filter(isIndexExclusion);
  const kept = new Set(scope.index_patterns);
  const dropped = Array.from(new Set(scope.missing)).filter((entry) => !kept.has(entry));
  return dropped.filter((entry) => {
    const bare = stripBackingPrefix(entry);
    // Still matched once the exclusions are applied means nothing excludes it.
    return buildMatchesRequired([bare, ...exclusionEntries])(bare);
  });
};

/**
 * The gap a run reports for the names its scope dropped: one final `index_not_searched` entry
 * naming them, or nothing when the scope dropped none.
 */
export const unsearchedGaps = (
  scope: Pick<HuntScope, 'index_patterns' | 'missing'>
): HuntIncompleteness[] => {
  const unsearched = unsearchedPatterns(scope);
  return unsearched.length > 0
    ? [{ reason: 'index_not_searched', detail: describeUnsearched(unsearched) }]
    : [];
};
