/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';
import { PND_GATE_IDS, deriveConversationIds } from '@kbn/pnd-common';

import { readProposalDecision } from '../read_proposal_decision';

/**
 * The Incident conversation an answer has just caused to be opened, or `undefined` when the answer
 * opened none — which is every answer but one.
 *
 * The 2026-08-17 Experience/UX sync, decision 6: *"the primary action label becomes 'Open an
 * incident'; opening one shows a toast with a link to the incident."* This is the "which answer
 * opened one" half, and it is exactly one gate: `promote_incident`, whose `role: 'container'` /
 * `parentKind: 'incident'` registry row makes it the only gate that opens an Incident (the registry's
 * two-container invariant means it always will be). Approving it resumes `watch_floor.yaml` into
 * `open_incident`; **dismissing** it deliberately opens nothing — *"creating one for a refused
 * escalation would be a lie"* — so a dismissal answers `undefined` here and gets the ordinary toast.
 *
 * The id is **derived, not read back**. `open_incident` creates the conversation at
 * `steps.derive_ids.output.incidentConversationId`, which is {@link deriveConversationIds}'s
 * `incidentConversationId` for the same alert — the same UUIDv5 the whole loop is keyed on — so the
 * link can be built the moment the resume returns rather than after polling for a conversation the
 * agent has not finished creating. A link the list cannot resolve yet renders the plain `/chats` list
 * rather than an error, which is the graceful degradation that deep link already documents.
 *
 * Fail-closed on a blank discovery id: an uncorrelated run has no alert id to key the incident on, so
 * there is no incident to link to and the caller falls back to the ordinary approval toast.
 */
export const readOpenedIncidentId = ({
  answer,
  proposal: { correlationId, gateId },
}: {
  answer: Record<string, unknown>;
  proposal: PndProposalRow;
}): string | undefined => {
  if (readProposalDecision(answer) !== 'approve' || gateId !== PND_GATE_IDS.promoteIncident) {
    return undefined;
  }

  return correlationId.trim().length === 0
    ? undefined
    : deriveConversationIds(correlationId).incidentConversationId;
};
