/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp, uniq } from 'lodash';
import type { Entity } from '@kbn/entity-store/common';
import type {
  Assessment,
  Assessments,
  Brief,
  Fact,
  VerificationSummary,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import type { AssessmentKey } from '../../../../../common/entity_analytics/executive_brief/brief';
import { ASSESSMENT_KEYS } from '../../../../../common/entity_analytics/executive_brief/brief';
import { entityDisplayName } from '../entity_record';
import type { Evidence } from '../signals';

export type VerificationCheck = keyof VerificationSummary['dropped'];

/** The evidence a brief is checked against, and what the checks have found so far. */
export interface CheckContext {
  readonly evidence: Evidence;
  /** Entity Store records by EUID. */
  readonly entities: ReadonlyMap<string, Entity>;
  readonly facts: ReadonlyMap<number, Fact>;
  /** The window label (e.g. "7d"); its number may be quoted. */
  readonly range?: string;
  /** Matches the entities' EUIDs and names that contain digits, so they aren't read as numbers. */
  readonly identifierPattern?: RegExp;
  /** Assessments to remove at the end, with the check that failed them; later checks skip them. */
  readonly dropped: Map<AssessmentKey, VerificationCheck>;
  /** Problems only the model can fix, sent back once in a repair round-trip. */
  readonly structuralErrors: string[];
  /** Clean-ups, for debug logging. */
  readonly notes: string[];
  /** Attention levels lowered to what the cited evidence supports. */
  lowered: number;
}

/** A check returns the brief with its clean-ups and records failures in the context. */
export type BriefCheck = (brief: Brief, context: CheckContext) => Brief;

/** Matches any of `values`, longest first; undefined when there are none. */
export const alternationPattern = (values: readonly string[], flags = ''): RegExp | undefined =>
  values.length > 0
    ? new RegExp(
        [...values]
          .sort((a, b) => b.length - a.length)
          .map(escapeRegExp)
          .join('|'),
        flags
      )
    : undefined;

export const createCheckContext = (evidence: Evidence, range?: string): CheckContext => {
  const identifiers = Object.entries(evidence.entities).flatMap(([euid, record]) => [
    euid,
    entityDisplayName(record, euid),
    record.entity?.name ?? '',
  ]);
  return {
    evidence,
    entities: new Map(Object.entries(evidence.entities)),
    facts: new Map(evidence.facts.map((fact) => [fact.id, fact])),
    range,
    identifierPattern: alternationPattern(
      uniq(identifiers.filter((identifier) => /\d/.test(identifier))),
      'gi'
    ),
    dropped: new Map(),
    structuralErrors: [],
    notes: [],
    lowered: 0,
  };
};

/** The cited facts that are in the evidence. */
export const citedFacts = ({ facts }: CheckContext, factIds: readonly number[]): Fact[] =>
  uniq(factIds).flatMap((id) => facts.get(id) ?? []);

/** The present assessments, in display order. */
export const assessmentsOf = (assessments: Assessments): Array<[AssessmentKey, Assessment]> =>
  ASSESSMENT_KEYS.flatMap((key): Array<[AssessmentKey, Assessment]> => {
    const assessment = assessments[key];
    return assessment ? [[key, assessment]] : [];
  });

/** Applies `update` to each present assessment; one it returns undefined for is removed. */
export const mapAssessments = (
  assessments: Assessments,
  update: (assessment: Assessment, key: AssessmentKey) => Assessment | undefined
): Assessments =>
  assessmentsOf(assessments).reduce<Assessments>((acc, [key, assessment]) => {
    const next = update(assessment, key);
    return next ? { ...acc, [key]: next } : acc;
  }, {});

/** The assessments not dropped yet. */
export const keptAssessments = (brief: Brief, { dropped }: CheckContext): Assessment[] =>
  assessmentsOf(brief.assessments)
    .filter(([key]) => !dropped.has(key))
    .map(([, assessment]) => assessment);

/** The fact ids the verdict rests on: those its kept assessments cite. */
export const verdictFactIds = (brief: Brief, context: CheckContext): number[] =>
  uniq(keptAssessments(brief, context).flatMap(({ factIds }) => factIds));

/** Fails a claim: drops an assessment, or records a structural error for the verdict (no key). */
export const failClaim = (
  context: CheckContext,
  key: AssessmentKey | undefined,
  check: VerificationCheck,
  reason: string
): void => {
  if (key === undefined) {
    context.structuralErrors.push(`verdict: ${reason}.`);
  } else if (!context.dropped.has(key)) {
    context.dropped.set(key, check);
    context.notes.push(`dropped assessments.${key} (${check}): ${reason}`);
  }
};
