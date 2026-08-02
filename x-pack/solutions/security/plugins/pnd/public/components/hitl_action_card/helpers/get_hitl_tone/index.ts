/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RecommendedAction } from '@kbn/pnd-common';

/** The three severities the approval card draws, from the prototype's `HitlProposalTone`. */
export const PND_HITL_TONES = ['danger', 'primary', 'warning'] as const;

export type PndHitlTone = (typeof PND_HITL_TONES)[number];

export interface GetHitlToneParams {
  recommendedAction: RecommendedAction;
  /** `false` when answering this gate cannot be undone. */
  reversible: boolean;
}

/**
 * The queue's own colour vocabulary, narrowed to the card's three tones: `tune`
 * is `accent` in `CONVERSATION_CATEGORY_COLORS`, which is not a severity, so it
 * reads as the neutral tone here.
 */
const TONE_BY_ACTION: Readonly<Record<RecommendedAction, PndHitlTone>> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'primary',
  tune: 'primary',
};

/**
 * How severe the card should look.
 *
 * Irreversibility outranks the recommended action: a gate that cannot be undone
 * is the one an analyst must not skim, whatever bucket it sits in. This is the
 * remaining job of `PndProposalRow.reversible` now that annotation 11a has taken
 * its badge off the row.
 *
 * Deliberately **not** keyed off the discovery's risk score. That score is
 * optional and a genuine `0` is possible, so a score-driven tone would render an
 * *absent* score as the mildest one — the same conflation of "unknown" and
 * "zero" this slice refuses everywhere else.
 */
export const getHitlTone = ({ recommendedAction, reversible }: GetHitlToneParams): PndHitlTone =>
  reversible ? TONE_BY_ACTION[recommendedAction] : 'danger';
