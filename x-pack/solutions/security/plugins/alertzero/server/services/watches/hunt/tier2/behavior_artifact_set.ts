/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntBehaviorIoc } from '@kbn/alertzero-common';
import type { ValidatedBehavior } from './types';
import { assertEsqlGroundedInReport } from './report_grounding';

/**
 * Fold case and whitespace so a value that differs from the quote only in formatting still
 * matches. Deliberately a one-line copy of the grounding gate's own `normalize` rather than an
 * import from it: this module's notion of a shared artifact is purely textual and must not drift
 * if the gate's own normalization ever changes for a different reason. Not Tier 1's IOC
 * normalizer either, which only lowercases some types and would miss others here.
 */
const normalize = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * A normalized report-IOC value shorter than this is never treated as an artifact-set member: a
 * short fragment is likely to appear in an unrelated quote by coincidence, which would merge two
 * behaviors that do not actually hunt the same thing.
 */
const MIN_ARTIFACT_LENGTH = 4;

/**
 * The report-IOC values a behavior's evidence quote actually names, as one stable key. Two
 * behaviors whose evidence names the same artifacts are hunting the same thing, whichever
 * technique each is filed under, so collapsing on this key pays for one query instead of one
 * per technique.
 *
 * A value counts when its normalized form is at least `MIN_ARTIFACT_LENGTH` characters and
 * appears anywhere inside the normalized quote — a plain substring test, with no word-boundary
 * check, so `example.com` inside `evil.example.com` counts. Every IOC the caller passed
 * participates, not only the ones a prompt happened to show the model. The IOC's `type` is not
 * part of the key: two IOCs of different types with the same value still count once. The
 * matching values are sorted, deduplicated, and joined so the key does not depend on `iocs`'
 * order. An evidence quote that names no shared artifact gets `null`, which never equals another
 * `null` for collapsing purposes — such a behavior is always alone.
 */
export const artifactSetKey = (
  evidenceQuote: string,
  iocs: readonly HuntBehaviorIoc[] | undefined
): string | null => {
  const quote = normalize(evidenceQuote);
  const matched = new Set<string>();
  for (const ioc of iocs ?? []) {
    const value = normalize(ioc.value);
    if (value.length < MIN_ARTIFACT_LENGTH) continue;
    if (quote.includes(value)) {
      matched.add(value);
    }
  }
  if (matched.size === 0) return null;
  return [...matched].sort().join('\u0000');
};

/**
 * Whether a query positively filters on every artifact in a collapse key, which is what the
 * `collapsed` reason claims about the survivor's query. Grounding is report-wide, so a survivor
 * can clear the grounding gate on an unrelated report literal and never hunt the artifacts its
 * siblings were collapsed for; a sibling marked `collapsed` against such a query would be
 * retired with a coverage claim nothing ever ran.
 *
 * Each artifact is read through the grounding gate rather than matched as text, so it counts
 * only where the gate would count it: in a `WHERE` that constrains rows to the value, not
 * negated, not beside an ungrounded branch, not sitting in an `EVAL` or a comment. Carrying the
 * string is not hunting it. An artifact is searched when the query grounds in it alone, or,
 * for a query that hunts several shared artifacts as alternatives (`IN (a, b)`, `a OR b`), when
 * the query grounds in the whole shared set and stops grounding once this artifact is taken
 * away: the alternative needs it, so rows for it come back. A query grounded on one artifact
 * and merely mentioning another fails the second test, because removing the mention changes
 * nothing. The second rule can miss an alternative nested under an `AND` whose other side
 * grounds on its own; that errs toward generating a sibling that was covered, never toward
 * retiring one that was not, which is the right way round for a reason marked final.
 *
 * This still says nothing about the action the sibling's technique implies around the
 * artifact; it establishes that the survivor's query searches the environment for the shared
 * artifacts, which is the coverage `collapsed` asserts.
 */
export const queryHuntsArtifacts = (esql: string, key: string): boolean => {
  const values = key.split('\u0000');
  const grounds = (iocValues: string[]): boolean =>
    assertEsqlGroundedInReport(esql, { reportText: '', iocValues }).ok;
  const groundsInWholeSet = grounds(values);
  return values.every(
    (value) =>
      grounds([value]) || (groundsInWholeSet && !grounds(values.filter((other) => other !== value)))
  );
};

/** One behavior dropped because another behavior already covers the same artifact set. */
export interface CollapsedBehavior {
  behavior: ValidatedBehavior;
  survivor: ValidatedBehavior;
  key: string;
}

export interface ArtifactSetCollapse {
  /** Every input behavior that keeps its own generation slot, in input order. */
  survivors: ValidatedBehavior[];
  collapsed: CollapsedBehavior[];
}

/**
 * Groups behaviors that share a non-null {@link artifactSetKey} and keeps one generation slot
 * per group: the highest-`confidence` member, tie-broken by the lexicographically lower
 * `technique_id` so the choice is the same every time the same input is collapsed. A behavior
 * whose key is `null` never merges with anything and always survives on its own.
 */
export const collapseByArtifactSet = (
  behaviors: ValidatedBehavior[],
  iocs: readonly HuntBehaviorIoc[] | undefined
): ArtifactSetCollapse => {
  const groups = new Map<string, ValidatedBehavior[]>();
  for (const behavior of behaviors) {
    const key = artifactSetKey(behavior.evidence_quote, iocs);
    if (key === null) continue;
    const group = groups.get(key);
    if (group) {
      group.push(behavior);
    } else {
      groups.set(key, [behavior]);
    }
  }

  const survivorOf = new Map<ValidatedBehavior, ValidatedBehavior>();
  const collapsed: CollapsedBehavior[] = [];
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const survivor = members.reduce((best, candidate) =>
      candidate.confidence > best.confidence ||
      (candidate.confidence === best.confidence && candidate.technique_id < best.technique_id)
        ? candidate
        : best
    );
    for (const member of members) {
      if (member !== survivor) {
        survivorOf.set(member, survivor);
        collapsed.push({ behavior: member, survivor, key });
      }
    }
  }

  const survivors = behaviors.filter((behavior) => !survivorOf.has(behavior));
  return { survivors, collapsed };
};
