/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttentionLevel,
  Brief,
  VerificationCheck,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { EvidenceIndex } from './evidence_index';

/** A removable item of the brief. The verdict is never removed: its failures are structural. */
export type ItemPath = `areas[${number}]`;

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

/** A unit of the brief that is kept or dropped as a whole. `path` is undefined for the verdict. */
export interface Claim {
  path: ItemPath | undefined;
  fields: ClaimField[];
  factIds: number[];
  linkIds: number[];
  level: AttentionLevel;
}

/** Lists the claims of a brief in a fixed order: verdict, then areas. */
export const listClaims = (brief: Brief): Claim[] => [
  {
    path: undefined,
    fields: [
      { path: 'verdict.headline', text: brief.verdict.headline },
      { path: 'verdict.summary', text: brief.verdict.summary },
    ],
    factIds: brief.verdict.factIds,
    linkIds: brief.verdict.linkIds,
    level: brief.verdict.level,
  },
  ...brief.areas.map((area, i): Claim => {
    const path: ItemPath = `areas[${i}]`;
    return {
      path,
      fields: [{ path: `${path}.summary`, text: area.summary }],
      factIds: area.factIds,
      linkIds: area.linkIds,
      level: area.level,
    };
  }),
];

export const isDropped = (context: CheckContext, path: ItemPath | undefined): boolean =>
  path !== undefined && context.dropped.has(path);

/** Records a failing claim: a drop for an area, a structural error for the verdict. */
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
