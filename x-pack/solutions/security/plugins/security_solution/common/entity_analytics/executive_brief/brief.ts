/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { BRIEF_LIMITS } from './constants';

/**
 * The brief the AI writes (via a forced tool call) and the server verifies.
 * Every claim cites evidence ids (ENT-n, F-n, L-n). Threats are composed by the AI;
 * verification checks each threat's entities are connected by the cited links.
 */

export const ATTENTION_LEVELS = ['urgent', 'action', 'watch', 'clear'] as const;
export type AttentionLevel = (typeof ATTENTION_LEVELS)[number];

export const AREA_IDS = ['threats', 'response'] as const;
export type AreaId = (typeof AREA_IDS)[number];

export const URGENCIES = ['now', 'this_week', 'next_review'] as const;
export type Urgency = (typeof URGENCIES)[number];

export const OWNERS = ['soc', 'it', 'iam', 'cloud', 'detection_engineering', 'leadership'] as const;
export type Owner = (typeof OWNERS)[number];

/** Maximum lengths of the brief's prose fields; longer AI output is trimmed server-side. */
export const BRIEF_TEXT_LIMITS = {
  verdictHeadline: 160,
  verdictSummary: 700,
  areaSummary: 200,
  threatTitle: 120,
  narrative: 900,
  whyItMatters: 500,
  nextStepAction: 240,
  actionText: 240,
  rationale: 500,
} as const;

const evidenceIds = z.array(z.string().max(16)).max(24);
const shortText = (max: number) => z.string().min(1).max(max);

export const briefSchema = lazySchema(() =>
  z.object({
    verdict: z.object({
      level: z.enum(ATTENTION_LEVELS),
      headline: shortText(BRIEF_TEXT_LIMITS.verdictHeadline),
      summary: shortText(BRIEF_TEXT_LIMITS.verdictSummary),
      evidence: evidenceIds,
    }),
    areas: z
      .array(
        z.object({
          id: z.enum(AREA_IDS),
          level: z.enum(ATTENTION_LEVELS),
          summary: shortText(BRIEF_TEXT_LIMITS.areaSummary),
          evidence: evidenceIds,
        })
      )
      .max(AREA_IDS.length),
    threats: z
      .array(
        z.object({
          title: shortText(BRIEF_TEXT_LIMITS.threatTitle),
          severity: z.enum(['critical', 'high', 'medium', 'low']),
          status: z.enum(['unaddressed', 'in_progress', 'contained']),
          confidence: z.enum(['high', 'medium', 'low']),
          /** ENT ids; must be connected through cited links or shared facts. */
          entities: z.array(z.string().max(16)).min(1).max(BRIEF_LIMITS.maxEntitiesPerThreat),
          narrative: shortText(BRIEF_TEXT_LIMITS.narrative),
          whyItMatters: shortText(BRIEF_TEXT_LIMITS.whyItMatters),
          /** F ids of facts with a time, in time order. */
          keyEvents: z.array(z.string().max(16)).max(BRIEF_LIMITS.maxKeyEventsPerThreat),
          evidence: evidenceIds,
          nextStep: z.object({
            action: shortText(BRIEF_TEXT_LIMITS.nextStepAction),
            owner: z.enum(OWNERS),
            urgency: z.enum(URGENCIES),
          }),
        })
      )
      .max(BRIEF_LIMITS.maxThreats),
    actions: z
      .array(
        z.object({
          action: shortText(BRIEF_TEXT_LIMITS.actionText),
          rationale: shortText(BRIEF_TEXT_LIMITS.rationale),
          urgency: z.enum(URGENCIES),
          owner: z.enum(OWNERS),
          /** 1-based index into threats, when the action relates to one. */
          threat: z.number().int().min(1).max(BRIEF_LIMITS.maxThreats).optional(),
          targets: z.array(z.string().max(16)).max(BRIEF_LIMITS.maxEntitiesPerThreat),
          evidence: evidenceIds,
        })
      )
      .max(BRIEF_LIMITS.maxActions),
  })
);

export type Brief = z.infer<typeof briefSchema>;
export type BriefThreat = Brief['threats'][number];
export type BriefAction = Brief['actions'][number];
export type BriefArea = Brief['areas'][number];

export type VerificationCheck = 'citation' | 'number' | 'connectivity' | 'relation' | 'guardrail';

/** A claim kept but flagged; `path` points into the brief, e.g. "threats[0].narrative". */
export interface VerificationFlag {
  path: string;
  check: VerificationCheck;
  message: string;
}

export interface VerificationSummary {
  /** Claims or items removed, per check. */
  dropped: Partial<Record<VerificationCheck, number>>;
  flags: VerificationFlag[];
  /** True when a repair round-trip was needed. */
  repaired: boolean;
}
