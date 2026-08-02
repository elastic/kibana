/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGateDefinitionByGateId, type PndGateParentKind } from '../../proposals/gate_registry';
import type { PndConversation, PndConversationRelation } from '../../schemas';
import { deriveConversationIds } from '../derive_conversation_ids';

/**
 * The two fields `parentOf` recovers. They map 1:1 onto Agent Builder PR #284458's
 * `parent_conversation_id` / `parent_conversation_relation`; PND never persists them.
 */
export interface PndConversationParentage {
  parentConversationId: string;
  parentConversationRelation: PndConversationRelation;
}

/**
 * Inputs `parentOf` reads. Everything needed is already on the conversation row
 * (`correlationId`, `kind`, `gateId`) plus `PND_GATE_REGISTRY.parentKind`.
 * `gateId` is a free string so an unvalidated value fails closed rather than minting parentage
 * for a gate that does not exist.
 */
export type ParentOfArgs = Pick<PndConversation, 'correlationId' | 'kind'> & {
  readonly gateId?: string;
};

const CONTAINER_CONVERSATION_ID_BY_PARENT_KIND: Record<
  PndGateParentKind,
  'incidentConversationId' | 'investigationConversationId'
> = {
  incident: 'incidentConversationId',
  investigation: 'investigationConversationId',
};

/**
 * Recover a conversation's parent as a read-time fold, stored nowhere.
 *
 * - container kinds (`investigation`, `incident`) → no value. The incident's upward
 *   sibling link is `promotedFrom`, not this field.
 * - `thread` → `deriveConversationIds(alertId)` at `PND_GATE_REGISTRY[gateId].parentKind`
 * - `tuning` (today's worker conversation) → the investigation, relation `worker`.
 *   A kind minted under `PND_WORKER_NAMESPACE` is not a conversation kind yet; when one
 *   is added, extend this switch — do not re-parent the incident.
 */
export const parentOf = ({
  correlationId,
  gateId,
  kind,
}: ParentOfArgs): PndConversationParentage | undefined => {
  if (correlationId.trim() === '') return undefined;

  switch (kind) {
    case 'incident':
    case 'investigation':
      return undefined;
    case 'thread': {
      if (gateId == null) return undefined;

      const gate = getGateDefinitionByGateId(gateId);
      if (gate == null) return undefined;

      const derived = deriveConversationIds(correlationId);

      return {
        parentConversationId: derived[CONTAINER_CONVERSATION_ID_BY_PARENT_KIND[gate.parentKind]],
        parentConversationRelation: 'thread',
      };
    }
    case 'tuning':
      return {
        parentConversationId: deriveConversationIds(correlationId).investigationConversationId,
        parentConversationRelation: 'worker',
      };
  }
};
