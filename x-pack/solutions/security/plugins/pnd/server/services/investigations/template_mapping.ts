/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEMPLATE_VERSION_CURRENT } from '@kbn/pnd-common';
import type { ConversationTemplateReference } from '@kbn/agent-builder-common';
import type { Investigation, Proposal, Incident } from '@kbn/pnd-common';
import type { Proposal as UiProposal } from '@kbn/pnd-common';
import type { ConversationWriterCreateRequest } from '@kbn/agent-builder-server';
import type { Proposal as CanonicalProposal } from '../../common/schemas';

/**
 * Backing agent id for every Conversation a PND Watch creates (investigation,
 * proposal, incident). Registered in `plugin.ts#setup()` and allow-listed in
 * `AGENT_BUILDER_BUILTIN_AGENTS` — see that registration's doc comment.
 * Extracted to a single constant rather than repeated as a literal in the 3
 * functions below: the previous 3-way copy of `'pnd-watch-orchestrator'` (an
 * id that was never actually registered anywhere) is exactly how that gap
 * went unnoticed.
 */
export const PND_WATCH_ORCHESTRATOR_AGENT_ID = 'security.pnd_watch_orchestrator';

/**
 * Maps a PND `template_id` literal to the platform
 * {@link ConversationTemplateReference} shape.
 *
 * The PND discriminated union (`'investigation' | 'proposal' | 'incident'`)
 * maps 1:1 onto the platform's `template.id` field. `template.version` is
 * pinned to {@link TEMPLATE_VERSION_CURRENT} so template evolution doesn't
 * retroactively invalidate persisted records.
 */
export function pndTemplateIdToConversationTemplate(
  templateId: 'investigation' | 'proposal' | 'incident'
): ConversationTemplateReference {
  return { id: templateId, version: TEMPLATE_VERSION_CURRENT };
}

/**
 * Maps a PND Investigation to a platform Conversation create request.
 *
 * The investigation's domain fields (watch_tier, severity, status, etc.) are
 * stored as stringified values in `extended_fields`, consistent with the
 * platform's flattened mapping convention. The investigation's `id` becomes
 * the `origin.external_conversation_id` so the platform conversation is
 * idempotently resolvable by its PND identifier.
 */
export function investigationToConversationCreate(
  inv: Investigation
): ConversationWriterCreateRequest {
  return {
    agent_id: PND_WATCH_ORCHESTRATOR_AGENT_ID,
    title: inv.title,
    template: pndTemplateIdToConversationTemplate('investigation'),
    extended_fields: {
      watch_id: inv.watch_id,
      watch_execution_id: inv.watch_execution_id,
      ...(inv.watch_tier ? { watch_tier: inv.watch_tier } : {}),
      ...(inv.severity ? { severity: inv.severity } : {}),
      ...(inv.status ? { status: inv.status } : {}),
      ...(inv.assignee ? { assignee: inv.assignee } : {}),
      ...(inv.recommendedAction ? { recommended_action: inv.recommendedAction } : {}),
      ...(inv.affectedSurface ? { affected_surface: inv.affectedSurface } : {}),
      pending_proposal_count: String(inv.pendingProposalCount),
    },
    rounds: [],
    origin: { external_conversation_id: inv.id },
  };
}

/**
 * Maps a PND Proposal to a platform Conversation create request.
 *
 * The proposal is a child of the parent Investigation conversation. The
 * `parentConversationId` on the PND Proposal becomes the platform's parent
 * linkage. The proposal's domain fields (confidence, verdict, status) are
 * stored as stringified values in `extended_fields`.
 */
export function proposalToConversationCreate(proposal: Proposal): ConversationWriterCreateRequest {
  return {
    agent_id: PND_WATCH_ORCHESTRATOR_AGENT_ID,
    title: proposal.summary || `Proposal: ${proposal.type}`,
    template: pndTemplateIdToConversationTemplate('proposal'),
    extended_fields: {
      parent_conversation_id: proposal.parentConversationId,
      confidence: String(proposal.confidence),
      proposal_type: proposal.type,
      status: proposal.status,
      source_watch_id: proposal.sourceWatchId,
      approval_required: String(proposal.approvalRequired),
      ...(proposal.assignee ? { assignee: proposal.assignee } : {}),
      ...(proposal.sla ? { sla: proposal.sla } : {}),
      ...(proposal.dismissalReason ? { dismissal_reason: proposal.dismissalReason } : {}),
    },
    rounds: [],
    origin: { external_conversation_id: proposal.id },
  };
}

/**
 * Maps a PND Incident to a platform Conversation create request.
 *
 * An Incident is a fork from an Investigation to a new root conversation.
 * The `forkedFromInvestigationId` is preserved in `extended_fields` so the
 * lineage is queryable.
 */
export function incidentToConversationCreate(incident: Incident): ConversationWriterCreateRequest {
  return {
    agent_id: PND_WATCH_ORCHESTRATOR_AGENT_ID,
    title: `Incident forked from ${incident.forkedFromInvestigationId}`,
    template: pndTemplateIdToConversationTemplate('incident'),
    extended_fields: {
      forked_from_investigation_id: incident.forkedFromInvestigationId,
      ...(incident.watch_id ? { watch_id: incident.watch_id } : {}),
      ...(incident.status ? { status: incident.status } : {}),
      ...(incident.severity ? { severity: incident.severity } : {}),
      ...(incident.assignee ? { assignee: incident.assignee } : {}),
    },
    rounds: [],
    origin: { external_conversation_id: incident.id },
  };
}

/**
 * Maps a PND canonical Proposal's status (`new | escalated | dismissed |
 * needs-evidence | modified | approved` — the Daybreak eval-contract enum
 * used by `saveProposal`) to the UI-facing Proposal status enum (`pending |
 * approved | modified | dismissed | escalated | deferred | executed` — the
 * analyst-workflow enum `updateProposalStatus` reads/writes). The two enums
 * only partly overlap; unmapped canonical statuses fall back to `pending`
 * since that's the safe "needs analyst attention" default.
 */
export function canonicalProposalStatusToUiStatus(
  status: CanonicalProposal['status']
): 'pending' | 'approved' | 'modified' | 'dismissed' | 'escalated' | 'deferred' | 'executed' {
  switch (status) {
    case 'escalated':
    case 'dismissed':
    case 'modified':
    case 'approved':
      return status;
    case 'new':
    case 'needs-evidence':
    default:
      return 'pending';
  }
}

/**
 * Projects a PND canonical Proposal (the Daybreak eval-contract shape
 * `saveProposal` persists to `pnd-canonical-proposals`) into the UI-facing
 * `ProposalDoc` shape the Investigations UI's Proposals tab reads via
 * `listProposals` from `pnd-proposals`.
 *
 * These are two different schemas for two different consumers (the eval/
 * scoring contract vs. the analyst CRUD workflow — see proposal.ts's header
 * comment and investigation.gen.ts's Proposal type) that were never
 * reconciled: every live Watch worker run wrote a canonical proposal that
 * was correctly persisted but invisible in the UI, because the UI only ever
 * read the separate `pnd-proposals` index (previously populated only by the
 * static 50-doc seed in real_data.ts). This projection is what makes a live
 * proposal show up in the Proposals tab without changing either schema.
 */
export function canonicalProposalToUiProposalDoc(
  proposal: CanonicalProposal
): Omit<UiProposal, 'template_version'> {
  return {
    id: proposal.id,
    template_id: 'proposal',
    parentConversationId: proposal.investigationId,
    type: proposal.sourceWatch,
    confidence: proposal.confidence,
    reasoning: proposal.reasoning,
    evidenceRefs: proposal.evidenceRefs.map((id) => ({ id, type: 'evidence' })),
    status: canonicalProposalStatusToUiStatus(proposal.status),
    assignee: null,
    sla: null,
    events: [],
    sourceWatchId: proposal.sourceWatch,
    approvalRequired: proposal.approvalRequired,
    summary: proposal.recommendation,
    recommendation: proposal.recommendation,
    ...(proposal.ruleTuningTrigger ? { ruleTuningTrigger: proposal.ruleTuningTrigger } : {}),
  };
}
