/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '../../schemas';
import { deriveConversationIds } from '../derive_conversation_ids';

/**
 * The one field `promotedFrom` recovers: the originating investigation conversation id.
 *
 * project-daybreak #137 decisions 1–2: the incident is a sibling, not a child. The link points
 * upwards only. The investigation does not know about its incidents — there is no reverse field.
 *
 * **1:1 thin-slice divergence.** Decision 7 is many-to-many. PND keys both ids on a single
 * Attack Discovery alert id, so this fold always recovers exactly one investigation. Changing
 * that would break the derivation the whole projection rests on. Recorded here so `.16` can cite it.
 */
export interface PndConversationPromotion {
  promotedFrom: string;
}

/**
 * Inputs `promotedFrom` reads. Everything needed is already on the conversation row
 * (`correlationId`, `kind`). The fold ignores a `promotedFrom` already on the row —
 * the link is recovered on read, stored nowhere.
 */
export type PromotedFromArgs = Pick<PndConversation, 'correlationId' | 'kind'>;

/**
 * Recover an incident's originating investigation as a read-time fold, stored nowhere.
 *
 * - `incident` → `deriveConversationIds(alertId).investigationConversationId`
 * - every other kind → no value
 *
 * This is **not** parentage. `parentOf` returns no value for both container kinds; the incident's
 * upward link is this field. Carry-over renders by traversing the id at read time — never by
 * copying the investigation's proposals or sub-conversations (decision 3). Use
 * {@link originatingInvestigation} for that traversal.
 */
export const promotedFrom = ({
  correlationId,
  kind,
}: PromotedFromArgs): PndConversationPromotion | undefined => {
  if (kind !== 'incident') return undefined;
  if (correlationId.trim() === '') return undefined;

  return {
    promotedFrom: deriveConversationIds(correlationId).investigationConversationId,
  };
};

export interface OriginatingInvestigationArgs {
  conversations: readonly PndConversation[];
  incident: PndConversation;
}

/**
 * Traverse `promotedFrom` at read time and return the originating investigation already in
 * `conversations`. Same object reference — never a copy. Returns no value when the incident has
 * no originating investigation or that conversation is not in the list.
 */
export const originatingInvestigation = ({
  conversations,
  incident,
}: OriginatingInvestigationArgs): PndConversation | undefined => {
  const originId = promotedFrom(incident)?.promotedFrom;
  if (originId == null) return undefined;

  return conversations.find((conversation) => conversation.id === originId);
};
