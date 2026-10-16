/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntBehaviorIoc } from '@kbn/alertzero-common';
import type { ValidatedBehavior } from './types';

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
