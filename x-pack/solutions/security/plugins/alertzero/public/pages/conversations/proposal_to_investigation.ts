/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalConfidence, ProposalImpact } from '@kbn/agentic-investigations-plugin/common';
import type { Investigation, RecommendedAction } from '@kbn/agentic-investigations-common';
import type { ProposalItem } from '../../../common/proposals/list';
import { CLOSED_GROUP_KEY } from '../../../common/proposals/list';

/**
 * Category an action declares → queue bucket. Keyed loosely because a category is an
 * arbitrary keyword (`actionCategorySchema` is a bounded string, not an enum), so an
 * action can declare one this page has never heard of.
 *
 * `tune` is retained for back-compatibility only: the shipped catalog now declares
 * `configure` directly, but proposals created before that snapshot their category at
 * creation and are never re-scored.
 */
const CATEGORY_TO_BUCKET: Record<string, RecommendedAction> = {
  respond: 'respond',
  contain: 'respond',
  investigate: 'investigate',
  configure: 'configure',
  tune: 'configure',
};

/**
 * An unrecognised or absent category still has to be visible — `groupedBriefingItems`
 * on the page drops any row whose `recommendedAction` matches no bucket.
 * `investigate` is the honest fallback: something a human has to look at.
 */
const FALLBACK_BUCKET: RecommendedAction = 'investigate';

/** Impact levels → numeric rank for `priorityScore` (max 80 from impact). */
const IMPACT_RANK: Record<ProposalImpact, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Confidence levels → numeric rank for `priorityScore` (max 15 from confidence). */
const CONFIDENCE_RANK: Record<ProposalConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Shown when the server could not read the proposal's conversation to get its title. */
const UNTITLED_INVESTIGATION = i18n.translate(
  'xpack.alertzero.conversationQueue.untitledInvestigationTitle',
  { defaultMessage: 'Untitled investigation' }
);

/**
 * Data gaps — fields that cannot be faithfully mapped from a ProposalItem:
 *
 * - `template_id`      fabricated `'investigation'`; a proposal is not an investigation.
 * - `watch_id`         fabricated `''`; no equivalent on a proposal.
 * - `watch_execution_id` fabricated `''`; no equivalent.
 * - `events`           `[]`; proposals have no timeline. The flyout renders an empty list.
 * - `affectedSurface`  `undefined`; BlastRadius self-hides (returns null) with no surfaces.
 * - `assignee`         `null`; `decidedBy` is the decider, not an owner.
 * - `status`           deliberately `undefined`. A proposal's own statuses (`'pending'`,
 *                      `'succeeded'`, …) are not investigation statuses, and mapping them
 *                      across would be inventing a meaning. The bucket carries the part
 *                      the queue actually needs: decided proposals land in `closed`.
 * - `severity`         lossy 4→3 collapse: `critical` → `'high'` so the danger icon fires.
 * - `updatedAt`        approximated as `decidedAt ?? createdAt`; proposals have no mtime.
 * - `recordId`         repurposed as the proposal id; the page gates dismiss/assign modals
 *                      on `modalState.recordId`, so this must be non-null for the ⋮ menu
 *                      items to work.
 * - `pendingProposalCount` degenerate (1 for pending, 0 for decided); one card IS one proposal.
 * - `confidence`, `origin`, `dismissReason`, `rationale`, `executionError`,
 *   `workflowExecutionId`, `decidedBy`, `expiresAt` — no destination in Investigation.
 */
export const proposalToInvestigation = (proposal: ProposalItem): Investigation => {
  // Closed detection mirrors groupProposals() server-side: decidedAt wins over category.
  const isClosed = Boolean(proposal.decidedAt);
  const bucket: RecommendedAction = isClosed
    ? CLOSED_GROUP_KEY
    : CATEGORY_TO_BUCKET[proposal.category ?? ''] ?? FALLBACK_BUCKET;

  const impactRank = IMPACT_RANK[proposal.impact];
  const confidenceRank = CONFIDENCE_RANK[proposal.confidence];

  return {
    id: proposal.id,
    template_id: 'investigation',
    // A card is titled by the investigation it belongs to, never by its action: the
    // action name is already the call to action, and repeating it as the title loses
    // the only thing that says which incident this decision is about.
    title: proposal.conversationTitle ?? UNTITLED_INVESTIGATION,
    createdAt: proposal.createdAt,
    // Proposals have no modification timestamp; decidedAt is the closest event.
    updatedAt: proposal.decidedAt ?? proposal.createdAt,
    // watch_id and watch_execution_id are required by the type but have no
    // equivalent on a proposal — fabricated as empty strings.
    watch_id: '',
    watch_execution_id: '',
    // status is deliberately omitted — see the data-gap note above.
    pendingProposalCount: proposal.decidedAt ? 0 : 1,
    recommendedAction: bucket,
    // severity collapse: 4-level impact → 3-level severity string.
    // 'critical' maps to 'high' so helpers.tsx's === 'high' check still fires.
    severity: proposal.impact === 'critical' ? 'high' : proposal.impact,
    // Synthetic priority score restores impact ranking that listByWindow's
    // createdAt-asc sort loses. Max: 4*20 + 3*5 = 95.
    priorityScore: impactRank * 20 + confidenceRank * 5,
    // recordId is repurposed to carry the proposal id into the ⋮ modal system.
    // The page renders dismiss/assign modals only if modalState.recordId is set.
    recordId: proposal.id,
    summary: proposal.comment,
    primaryActionLabel: proposal.action?.name,
    assignee: null,
    events: [],
    // affectedSurface left undefined → BlastRadius self-hides (returns null).
  };
};
