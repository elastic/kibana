/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EscalationQueueItem } from '@kbn/agentic-investigations-common';
import type { EscalationConversationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_STATUS_FIELD,
} from '@kbn/agentic-investigations-plugin/common';

/**
 * Adapts the raw API response shape (`EscalationConversationSummary`) into the
 * view-model the shared components consume (`EscalationQueueItem`).
 *
 * Data-gap notes — mirrors the spirit of `proposal_to_investigation.ts`:
 *
 * - `status`: read from `metadata.status` and coerced to 'open' when absent (the
 *   escalation template's default, or an escalation created before the template
 *   applied it). The server's list filter already splits open vs closed, so this
 *   coercion only matters for `status: 'all'` queries.
 *
 * - `linkedInvestigationCount`: the metadata field is a string array of conversation
 *   ids; we only need the count, never the ids themselves, in the queue row.
 *
 * - `assigneeUids`: user profile uids stored as a string array in `metadata.assignees`.
 *   Missing or non-array values default to an empty list.
 */
export const escalationToQueueItem = (
  escalation: EscalationConversationSummary
): EscalationQueueItem => {
  const rawStatus = escalation.metadata?.[ESCALATION_STATUS_FIELD];
  const status: EscalationQueueItem['status'] = rawStatus === 'closed' ? 'closed' : 'open';

  const rawLinkedInvestigations = escalation.metadata?.[ESCALATION_LINKED_INVESTIGATIONS_FIELD];
  const linkedInvestigationCount = Array.isArray(rawLinkedInvestigations)
    ? rawLinkedInvestigations.length
    : 0;

  const rawAssignees = escalation.metadata?.[ESCALATION_ASSIGNEES_FIELD];
  const assigneeUids: readonly string[] = Array.isArray(rawAssignees)
    ? (rawAssignees as string[])
    : [];

  return {
    id: escalation.id,
    title: escalation.title,
    status,
    createdAt: escalation.created_at,
    updatedAt: escalation.updated_at,
    linkedInvestigationCount,
    assigneeUids,
  };
};
