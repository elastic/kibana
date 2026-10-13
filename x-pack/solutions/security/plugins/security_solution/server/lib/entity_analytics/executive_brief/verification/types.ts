/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Assessment,
  AssessmentKey,
  AttentionLevel,
  Brief,
  VerificationCheck,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import { ASSESSMENT_KEYS } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { EvidenceIndex } from './evidence_index';

/** A removable item of the brief. The verdict is never removed: its failures are structural. */
export type ItemPath = `assessments.${AssessmentKey}`;

export interface ItemDrop {
  path: ItemPath;
  check: VerificationCheck;
  reason: string;
}

/**
 * Result of one check. Checks never remove items (so paths stay stable across checks); they mark
 * them in `drops`, and `verifyBrief` removes them at the end.
 */
export interface CheckOutcome {
  brief: Brief;
  drops: ItemDrop[];
  /** Problems only the model can fix (sent back once in a repair round-trip). */
  structuralErrors: string[];
  /** Attention levels lowered to what the cited evidence supports. */
  lowered: number;
  /** Non-blocking clean-ups, for debug logging (e.g. unknown ids removed). */
  notes: string[];
}

export interface CheckContext {
  index: EvidenceIndex;
  /** Items already marked for removal by an earlier check; later checks skip them. */
  dropped: ReadonlySet<string>;
}

export type BriefCheck = (brief: Brief, context: CheckContext) => CheckOutcome;

export const emptyOutcome = (brief: Brief): CheckOutcome => ({
  brief,
  drops: [],
  structuralErrors: [],
  lowered: 0,
  notes: [],
});

/** A prose field of a claim, with its path into the brief. */
export interface ClaimField {
  path: string;
  text: string;
}

/**
 * A unit of the brief that is kept or dropped as a whole. `path` is undefined for the verdict,
 * whose `factIds` are those its kept assessments cite.
 */
export interface Claim {
  path: ItemPath | undefined;
  fields: ClaimField[];
  factIds: number[];
  level: AttentionLevel;
}

export const assessmentPath = (key: AssessmentKey): ItemPath => `assessments.${key}`;

/** The assessments that are present, in `ASSESSMENT_KEYS` order. */
export const presentAssessments = (
  assessments: Brief['assessments']
): Array<{ key: AssessmentKey; assessment: Assessment }> =>
  ASSESSMENT_KEYS.flatMap((key) => {
    const assessment = assessments[key];
    return assessment ? [{ key, assessment }] : [];
  });

/** Applies `update` to each present assessment; absent ones stay absent. */
export const mapAssessments = (
  assessments: Brief['assessments'],
  update: (assessment: Assessment, key: AssessmentKey) => Assessment
): Brief['assessments'] =>
  presentAssessments(assessments).reduce<Brief['assessments']>(
    (acc, { key, assessment }) => ({ ...acc, [key]: update(assessment, key) }),
    {}
  );

/** The assessments not marked for removal, in `ASSESSMENT_KEYS` order. */
export const keptAssessments = (
  assessments: Brief['assessments'],
  dropped: ReadonlySet<string>
): Assessment[] =>
  presentAssessments(assessments)
    .filter(({ key }) => !dropped.has(assessmentPath(key)))
    .map(({ assessment }) => assessment);

/** The fact ids the verdict rests on: those its kept assessments cite. */
export const verdictFactIds = (
  assessments: Brief['assessments'],
  dropped: ReadonlySet<string>
): number[] => [
  ...new Set(keptAssessments(assessments, dropped).flatMap(({ factIds }) => factIds)),
];

/** Lists the claims of a brief in a fixed order: verdict, then assessments. */
export const listClaims = (brief: Brief, { dropped }: CheckContext): Claim[] => [
  {
    path: undefined,
    fields: [
      { path: 'verdict.headline', text: brief.verdict.headline },
      { path: 'verdict.summary', text: brief.verdict.summary },
    ],
    factIds: verdictFactIds(brief.assessments, dropped),
    level: brief.verdict.level,
  },
  ...presentAssessments(brief.assessments).map(({ key, assessment }): Claim => {
    const path = assessmentPath(key);
    return {
      path,
      fields: [{ path: `${path}.summary`, text: assessment.summary }],
      factIds: assessment.factIds,
      level: assessment.level,
    };
  }),
];

export const isDropped = (context: CheckContext, path: ItemPath | undefined): boolean =>
  path !== undefined && context.dropped.has(path);

/** Records a failing claim: a drop for an assessment, a structural error for the verdict. */
export const reportClaim = (
  outcome: CheckOutcome,
  claim: Claim,
  check: VerificationCheck,
  reason: string
): void => {
  if (claim.path === undefined) {
    outcome.structuralErrors.push(`verdict: ${reason}.`);
  } else {
    outcome.drops.push({ path: claim.path, check, reason });
  }
};
