/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ProposalConfidence, ProposalImpact } from '@kbn/proposals-common';
import type { Investigation, RecommendedAction } from '@kbn/agentic-investigations-common';
import type { InvestigationQueueItem, ProposalItem } from '../../../common/investigations/queue';
import { CLOSED_GROUP_KEY } from '../../../common/investigations/queue';

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

/** Shown when the server could not read the investigation's title. */
const UNTITLED_INVESTIGATION = i18n.translate(
  'xpack.alertzero.conversationQueue.untitledInvestigationTitle',
  { defaultMessage: 'Untitled investigation' }
);

/**
 * What a card is keyed by. An open card stands for the lead proposal it acts on, so the
 * approval modal, the in-flight badge and the optimistic drop all address that proposal;
 * a closed card has no proposal and stands for the investigation itself.
 */
export const queueCardId = ({ id, leadProposal }: InvestigationQueueItem): string =>
  leadProposal?.id ?? id;

/** The lead proposal with the investigation fields the approval flows read alongside it. */
export const toProposalItem = (item: InvestigationQueueItem): ProposalItem | undefined =>
  item.leadProposal
    ? {
        ...item.leadProposal,
        ...(item.title ? { conversationTitle: item.title } : {}),
        ...(item.agentId ? { conversationAgentId: item.agentId } : {}),
        conversationAssignees: item.assignees,
        ...(item.entityIds ? { entityIds: item.entityIds } : {}),
      }
    : undefined;

/**
 * Data gaps — fields that cannot be faithfully mapped from an InvestigationQueueItem:
 *
 * - `worker_execution_ids` empty; the queue does not read them.
 * - `events`           `[]`; the queue does not read the timeline. The flyout renders its own.
 * - `severity`         from the lead proposal's impact, lossy 4→3: `critical` → `'high'` so
 *                      the danger icon fires. Absent for closed investigations.
 * - `priorityScore`    synthetic, from the lead proposal's impact and confidence.
 * - `createdAt`        the newest proposal's creation for an open card, so the age reads as how
 *                      long ago the queue last heard from its proposals.
 * - lead proposal      absent once every proposal in the category is decided. The card then
 *                      offers no proposed action, and has no severity or priority of its own.
 * - `recordId`         repurposed as the lead proposal id; the page gates dismiss/assign modals
 *                      on `modalState.recordId`, so this must be non-null for the ⋮ menu
 *                      items to work.
 */
export const investigationQueueItemToInvestigation = (
  item: InvestigationQueueItem
): Investigation => {
  const proposal = item.leadProposal;
  const bucket: RecommendedAction =
    item.status === 'closed'
      ? CLOSED_GROUP_KEY
      : CATEGORY_TO_BUCKET[item.category ?? ''] ?? FALLBACK_BUCKET;

  return {
    id: queueCardId(item),
    template_id: 'investigation',
    title: item.title ?? UNTITLED_INVESTIGATION,
    createdAt: item.newestProposalAt ?? item.createdAt,
    updatedAt: item.updatedAt,
    worker_execution_ids: [],
    status: item.status,
    pendingProposalCount: item.pendingProposalCount ?? 0,
    recommendedAction: bucket,
    ...(proposal
      ? {
          // 'critical' maps to 'high' so helpers.tsx's === 'high' check still fires.
          severity: proposal.impact === 'critical' ? 'high' : proposal.impact,
          // Max: 4*20 + 3*5 = 95.
          priorityScore:
            IMPACT_RANK[proposal.impact] * 20 + CONFIDENCE_RANK[proposal.confidence] * 5,
        }
      : {}),
    recordId: queueCardId(item),
    conversationId: item.id,
    // One plain line from `metadata.description`; the card hides the row without it.
    summary: item.description,
    primaryActionLabel: proposal ? proposal.title : item.description,
    assignee: item.assignees[0] ?? null,
    assignees: item.assignees,
    events: [],
    entityIds: item.entityIds,
    affectedSurface: item.entityIds?.[0],
  };
};
