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
import { codeList } from './text_lists';
import { globMatches } from './index_glob';

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
 * Whether Elasticsearch would search `name` for this ordered list of entries. An exclusion
 * removes the name when its pattern matches, and a later entry brings it back only by naming
 * it: a wildcard that happens to match the text does not, because it expands to open indices
 * and the name is not one that can be searched. So `['logs-*', '-custom-*', 'custom-1']`
 * searches `custom-1`, while `['custom-1', '-custom-1', 'custom-*']` does not.
 */
const isIncludedByUniverse = (name: string, entries: ParsedUniverseEntry[]): boolean => {
  // The name comes from the list's own positive entries, so it starts out included.
  let included = true;
  for (const { exclude, pattern } of entries) {
    if (exclude ? globMatches(pattern, name) : pattern === name) included = !exclude;
  }
  return included;
};

interface ParsedUniverseEntry {
  exclude: boolean;
  pattern: string;
}

const parseUniverse = (universe: string[]): ParsedUniverseEntry[] =>
  universe.map((entry) => {
    const { exclude, ...target } = parseIndexScopeEntry(entry);
    return { exclude: Boolean(exclude), pattern: stripBackingPrefix(joinRemoteCluster(target)) };
  });

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
  const entries = parseUniverse(universe);
  return Array.from(new Set(scope.missing))
    .filter((entry) => !kept.has(entry))
    .filter((entry) => isIncludedByUniverse(stripBackingPrefix(entry), entries));
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
