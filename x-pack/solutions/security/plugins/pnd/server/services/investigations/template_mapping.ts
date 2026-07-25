/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEMPLATE_VERSION_CURRENT } from '@kbn/pnd-common';
import type { ConversationTemplateReference } from '@kbn/agent-builder-common';
import type { Investigation, Proposal, Incident } from '@kbn/pnd-common';
import type { ConversationWriterCreateRequest } from '@kbn/agent-builder-server';

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
    agent_id: 'pnd-watch-orchestrator',
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
    agent_id: 'pnd-watch-orchestrator',
    title: proposal.summary ?? `Proposal: ${proposal.type}`,
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
      ...(proposal.verdict ? { verdict: proposal.verdict } : {}),
      ...(proposal.dismissalReason ? { dismissal_reason: proposal.dismissalReason } : {}),
    },
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
    agent_id: 'pnd-watch-orchestrator',
    title: `Incident forked from ${incident.forkedFromInvestigationId}`,
    template: pndTemplateIdToConversationTemplate('incident'),
    extended_fields: {
      forked_from_investigation_id: incident.forkedFromInvestigationId,
      ...(incident.watch_id ? { watch_id: incident.watch_id } : {}),
      ...(incident.status ? { status: incident.status } : {}),
      ...(incident.severity ? { severity: incident.severity } : {}),
      ...(incident.assignee ? { assignee: incident.assignee } : {}),
    },
    origin: { external_conversation_id: incident.id },
  };
}
