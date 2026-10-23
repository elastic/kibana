/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isProposalSettling, isTerminal } from '@kbn/proposals-common';
import type { ProposalConfidence, ProposalImpact } from '@kbn/proposals-common';
import type { Investigation, RecommendedAction } from '@kbn/agentic-investigations-common';
import type { ProposalItem } from '../../../common/proposals/list';
import { CLOSED_GROUP_KEY } from '../../../common/proposals/list';

/**
 * Category an action declares → queue bucket. Keyed loosely because a category is an
 * arbitrary keyword (`actionCategorySchema` is a bounded string, not an enum), so an
 * action can declare one this page has never heard of.
 */
const CATEGORY_TO_BUCKET: Record<string, RecommendedAction> = {
  respond: 'respond',
  investigate: 'investigate',
  configure: 'configure',
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
 * - `worker_execution_ids` empty; no equivalent on a proposal.
 * - `events`           `[]`; proposals have no timeline. The flyout renders an empty list.
 * - `affectedSurface`  first Impact entity id, when hydrated; otherwise undefined.
 * - `entityIds`        from the conversation's Impact document; omitted when none.
 * - `status`           deliberately `undefined`. A proposal status (`'pending'`, `'succeeded'`, …)
 *                      is not an investigation status. The bucket gives the queue what it
 *                      needs: a settled proposal goes to `closed`. An approved proposal that
 *                      still runs stays in its category. `isProposalSettling` marks it.
 * - `severity`         lossy 4→3 collapse: `critical` → `'high'` so the danger icon fires.
 * - `proposalCreatedAt` / `proposalDecidedAt` the proposal's own timestamps. The decision time
 *                      dates the closed rows.
 * - `recordId`         repurposed as the proposal id; the page gates dismiss/assign modals
 *                      on `modalState.recordId`, so this must be non-null for the ⋮ menu
 *                      items to work.
 * - `pendingProposalCount` is 1 for a pending proposal and 0 for any other.
 * - `confidence`, `origin`, `dismissReason`, `rationale`, `executionError`,
 *   `workflowExecutionId`, `decidedBy`, `expiresAt` — no destination in Investigation.
 */
export const proposalToInvestigation = (proposal: ProposalItem): Investigation => {
  // A proposal is closed when it settles, not when it is decided. An approved proposal stays in
  // its category while its action runs. This matches the server, which lists by status.
  const isClosed = isTerminal(proposal.status);
  const bucket: RecommendedAction = isClosed
    ? CLOSED_GROUP_KEY
    : CATEGORY_TO_BUCKET[proposal.category ?? ''] ?? FALLBACK_BUCKET;

  const impactRank = IMPACT_RANK[proposal.impact];
  const confidenceRank = CONFIDENCE_RANK[proposal.confidence];
  const conversationTitle = proposal.conversationTitle ?? UNTITLED_INVESTIGATION;

  return {
    id: proposal.id,
    template_id: 'investigation',
    title: proposal.title,
    createdAt: proposal.createdAt,
    proposalCreatedAt: proposal.createdAt,
    proposalDecidedAt: proposal.decidedAt,
    // Proposals do not carry worker execution IDs.
    worker_execution_ids: [],
    // status is deliberately omitted — see the data-gap note above.
    pendingProposalCount: proposal.status === 'pending' ? 1 : 0,
    isProposalSettling: isProposalSettling(proposal),
    recommendedAction: bucket,
    // severity collapse: 4-level impact → 3-level severity string.
    // 'critical' maps to 'high' so helpers.tsx's === 'high' check still fires.
    severity: proposal.impact === 'critical' ? 'high' : proposal.impact,
    // Synthetic priority score drives impact-first ordering in the queue.
    // The server sorts by createdAt, so this re-ranks client-side. Max: 4*20 + 3*5 = 95.
    priorityScore: impactRank * 20 + confidenceRank * 5,
    // recordId is repurposed to carry the proposal id into the ⋮ modal system.
    // The page renders dismiss/assign modals only if modalState.recordId is set.
    recordId: proposal.id,
    conversationId: proposal.conversationId,
    summary: conversationTitle,
    // Decided rows have no action button, and the compact row prints this after the title.
    primaryActionLabel: isClosed ? conversationTitle : proposal.title,
    // `conversationAssignees` is an array but `Investigation.assignee` is singular,
    // because the flyout header renders one avatar. First entry wins, as in the
    // conversation adapter.
    assignee: proposal.conversationAssignees[0] ?? null,
    assignees: proposal.conversationAssignees,
    events: [],
    entityIds: proposal.entityIds,
    entityTypes: proposal.entityTypes,
    // First id feeds the flyout Overview "Compromised" row until that surface
    // reads `entityIds` directly. Pills and the queue filter use `entityIds`.
    affectedSurface: proposal.entityIds?.[0],
  };
};
