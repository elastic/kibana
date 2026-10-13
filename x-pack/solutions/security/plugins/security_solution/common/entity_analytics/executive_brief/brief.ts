/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * The brief the AI writes (via a forced tool call) and the server verifies. Every claim cites the
 * facts and links behind it by id, in `factIds` and `linkIds`. Prose mentions entities by EUID
 * (see `ENTITY_MENTION_FIELD`). Versioned through the document's `schema_version`; threats and
 * actions are added in a later schema version.
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

/** Most fact or link ids one claim may cite. */
export const MAX_CITED_IDS = 24;

const citedIds = () => z.array(z.number().int()).max(MAX_CITED_IDS);
const shortText = (max: number) => z.string().min(1).max(rawTextLimit(max));

export const briefSchema = lazySchema(() =>
  z.object({
    verdict: z.object({
      level: z.enum(ATTENTION_LEVELS),
      headline: shortText(BRIEF_TEXT_LIMITS.verdictHeadline),
      summary: shortText(BRIEF_TEXT_LIMITS.verdictSummary),
      factIds: citedIds(),
      linkIds: citedIds(),
    }),
    areas: z
      .array(
        z.object({
          id: z.enum(AREA_IDS),
          level: z.enum(ATTENTION_LEVELS),
          summary: shortText(BRIEF_TEXT_LIMITS.areaSummary),
          factIds: citedIds(),
          linkIds: citedIds(),
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
