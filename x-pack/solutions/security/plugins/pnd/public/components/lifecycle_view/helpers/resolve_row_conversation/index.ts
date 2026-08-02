/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveConversationIds } from '@kbn/pnd-common';
import type { PndConversation, PndConversationKind } from '@kbn/pnd-common';

/**
 * The catalog rows whose lifecycle step opens an Agent Builder conversation, and which of the three
 * derived conversations each one opens.
 *
 * The three `ai.agent` steps that create conversations are `open_investigation`, `open_incident` and
 * `draft_tuning`. Only two of them are catalog rows in their own right: `open_incident` has no
 * `orchestratorStepId`, so its thread is offered on `step-3-5` ("Confirm containment"), the one
 * Incident Response row. That is not a mismatch — the incident conversation *is* the analyst surface
 * for containment work, so the row an analyst opens to confirm containment is where they want it.
 * It previously hung off the documented-only `step-3-1` row, which kibana-phf4.12 deleted.
 */
export const CONVERSATION_KIND_BY_PHASE_STEP_ID: Readonly<Record<string, PndConversationKind>> = {
  'step-2-1': 'investigation',
  'step-3-5': 'incident',
  'step-4-2': 'tuning',
};

export interface ResolveRowConversationParams {
  correlationId: string;
  /** `conversations` from `GET /internal/pnd/conversations`. */
  conversations: readonly PndConversation[];
  phaseStepId: string;
}

const derivedIdFor = (correlationId: string, kind: PndConversationKind): string | undefined => {
  const { incidentConversationId, investigationConversationId, tuningConversationId } =
    deriveConversationIds(correlationId);

  if (kind === 'investigation') return investigationConversationId;
  if (kind === 'incident') return incidentConversationId;
  return tuningConversationId;
};

/**
 * The conversation a lifecycle row opens, **only when it really exists**.
 *
 * `deriveConversationIds` is a pure function of the discovery id, so it always answers — including
 * for a conversation no step has created. A run parked at gate 1 never opened the incident thread,
 * and linking to the derived id anyway 404s in Agent Builder, mid-demo. So the row's action is gated
 * on the id appearing in the space's conversation list rather than on the derivation: the affordance
 * shows up exactly when the thread is there.
 */
export const resolveRowConversation = ({
  correlationId,
  conversations,
  phaseStepId,
}: ResolveRowConversationParams): PndConversation | undefined => {
  const kind = CONVERSATION_KIND_BY_PHASE_STEP_ID[phaseStepId];

  if (kind == null || correlationId === '') {
    return undefined;
  }

  const derivedId = derivedIdFor(correlationId, kind);

  return conversations.find(({ id }) => id === derivedId);
};
