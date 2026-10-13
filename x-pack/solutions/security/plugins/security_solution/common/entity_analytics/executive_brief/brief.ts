/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * The brief the AI writes (via a forced tool call) and the server verifies. Every claim cites
 * fact and link ids (F-n, L-n). The model names entities by prompt-only ids (ENT-n), which the
 * server replaces with EUIDs before storing. Versioned through the document's `schema_version`;
 * threats and actions are added in a later schema version.
 */

export const ATTENTION_LEVELS = ['urgent', 'action', 'watch', 'clear'] as const;
export type AttentionLevel = (typeof ATTENTION_LEVELS)[number];

export const AREA_IDS = ['threats', 'response'] as const;
export type AreaId = (typeof AREA_IDS)[number];

/**
 * Prose mentions an entity as `{{ entity.id <euid> }}`: Attack Discovery's `{{ field value }}`
 * syntax, keyed by EUID so it names exactly one Entity Store entity. Resolve the display name
 * from the entities that come with the brief.
 */
export const ENTITY_MENTION_FIELD = 'entity.id';

/**
 * Maximum visible lengths of the brief's prose fields, counting a mention as its display name;
 * longer AI output is trimmed server-side.
 */
export const BRIEF_TEXT_LIMITS = {
  verdictHeadline: 160,
  verdictSummary: 700,
  areaSummary: 200,
} as const;

/** Mention tokens are longer than the names they show, so raw prose is bounded more loosely. */
export const rawTextLimit = (visibleLimit: number): number => visibleLimit * 4;

const evidenceIds = z.array(z.string().max(16)).max(24);
const shortText = (max: number) => z.string().min(1).max(rawTextLimit(max));

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
  })
);

export type Brief = z.infer<typeof briefSchema>;
export type BriefArea = Brief['areas'][number];

export type VerificationCheck = 'citation' | 'number' | 'guardrail';

export interface VerificationSummary {
  /** Claims or items removed, per check. */
  dropped: Partial<Record<VerificationCheck, number>>;
  /** Attention levels lowered to what the cited evidence supports. */
  lowered: number;
  /** True when a repair round-trip was needed. */
  repaired: boolean;
}
