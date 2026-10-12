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
  VerificationFlag,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type { EvidenceIndex } from './evidence_index';

/** A removable item of the brief. The verdict is never removed: its failures are structural. */
export type ItemPath = `areas[${number}]` | `threats[${number}]` | `actions[${number}]`;

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
  flags: VerificationFlag[];
  /** Problems the model must fix (sent back once in a repair round-trip). */
  structuralErrors: string[];
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
  flags: [],
  structuralErrors: [],
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
  label: string;
  fields: ClaimField[];
  /** Every id the claim cites (evidence, key events). */
  evidence: string[];
  /** Entities the claim is about (threat entities, action targets). */
  entities: string[];
  level?: AttentionLevel;
}

/** Lists the claims of a brief in a fixed order: verdict, areas, threats, actions. */
export const listClaims = (brief: Brief): Claim[] => [
  {
    path: undefined,
    label: 'verdict',
    fields: [
      { path: 'verdict.headline', text: brief.verdict.headline },
      { path: 'verdict.summary', text: brief.verdict.summary },
    ],
    evidence: brief.verdict.evidence,
    entities: [],
    level: brief.verdict.level,
  },
  ...brief.areas.map((area, i): Claim => {
    const path: ItemPath = `areas[${i}]`;
    return {
      path,
      label: path,
      fields: [{ path: `${path}.summary`, text: area.summary }],
      evidence: area.evidence,
      entities: [],
      level: area.level,
    };
  }),
  ...brief.threats.map((threat, i): Claim => {
    const path: ItemPath = `threats[${i}]`;
    return {
      path,
      label: path,
      fields: [
        { path: `${path}.title`, text: threat.title },
        { path: `${path}.narrative`, text: threat.narrative },
        { path: `${path}.whyItMatters`, text: threat.whyItMatters },
        { path: `${path}.nextStep.action`, text: threat.nextStep.action },
      ],
      evidence: [...threat.evidence, ...threat.keyEvents],
      entities: threat.entities,
    };
  }),
  ...brief.actions.map((action, i): Claim => {
    const path: ItemPath = `actions[${i}]`;
    return {
      path,
      label: path,
      fields: [
        { path: `${path}.action`, text: action.action },
        { path: `${path}.rationale`, text: action.rationale },
      ],
      evidence: action.evidence,
      entities: action.targets,
    };
  }),
];

export const isDropped = (context: CheckContext, path: ItemPath | undefined): boolean =>
  path !== undefined && context.dropped.has(path);
