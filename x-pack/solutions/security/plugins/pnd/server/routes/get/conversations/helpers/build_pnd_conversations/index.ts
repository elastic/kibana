/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import {
  deriveAllThreadConversationIds,
  deriveConversationIds,
  parentOf,
  type PndConversation,
  type PndGateId,
} from '@kbn/pnd-common';

import { stripKindTitlePrefix } from '../strip_kind_title_prefix';

interface DerivedConversationSource {
  correlationId: string;
  /**
   * The gate whose proposal this thread is paired with. Present only on a `thread` source: the
   * other three kinds are keyed on the alert id alone and have no gate.
   *
   * Typed `PndGateId` and assigned straight into `PndConversation['gateId']` below, so the closed
   * enum in the route contract and the gate registry cannot drift apart without failing this
   * file's type check.
   */
  gateId?: PndGateId;
  kind: PndConversation['kind'];
}

export interface BuildPndConversationsParams {
  /** Attack Discovery alert ids the caller can read in this space. */
  correlationIds: string[];
  /** The caller's Agent Builder conversations, already access-filtered per user. */
  conversations: ConversationWithoutRounds[];
}

/**
 * Intersect the set of conversation ids **derived** from the space's Attack Discovery alerts with
 * the caller's Agent Builder conversations, returning only the PND conversations. `kind`
 * (`investigation` | `incident` | `tuning` | `thread`) comes from which namespace produced the id —
 * never from a stored type field. Agent Builder titles may carry `[Investigation]` / `[Incident]`
 * prefixes (D5); those are stripped here so PND surfaces never show them.
 *
 * **All seven derived ids per alert must be registered here.** Three come from the alert-keyed
 * namespaces (`investigation`, `incident`, `tuning`) and four from the gate-keyed `[Thread]`
 * namespace — one per gate in `PND_GATE_REGISTRY`, because a thread is keyed on
 * `(correlationId, gateId)` (D1) rather than on the alert id alone.
 *
 * Omitting any one of them hides a conversation that really exists, with no error anywhere, because
 * a surface can only reach a conversation it can see: the chats view lists this response, and the
 * four-phase view gates its "Open conversation" action on the derived id appearing in it rather than
 * on the derivation itself (deriving always answers, including for a conversation no step has
 * created). That was already true of `tuning` — the Phase-4 thread `draft_tuning` opens is a real
 * conversation on `pnd.detection_tuning` — and it is equally true of every thread `_ensure`
 * materialises when a HITL gate parks.
 *
 * The reverse is not a risk: registering an id costs nothing when the conversation does not exist,
 * because the intersection drops it.
 */
export const buildPndConversations = ({
  correlationIds,
  conversations,
}: BuildPndConversationsParams): PndConversation[] => {
  const derivedById = new Map<string, DerivedConversationSource>();

  for (const correlationId of correlationIds) {
    const { incidentConversationId, investigationConversationId, tuningConversationId } =
      deriveConversationIds(correlationId);

    derivedById.set(investigationConversationId, {
      correlationId,
      kind: 'investigation',
    });
    derivedById.set(incidentConversationId, { correlationId, kind: 'incident' });
    derivedById.set(tuningConversationId, { correlationId, kind: 'tuning' });

    // One thread per registered gate. `deriveAllThreadConversationIds` fails closed — a blank alert
    // id yields no ids at all — so a degraded `derive_ids` can never widen the set of conversations
    // this route treats as PND-owned.
    for (const { gateId, threadConversationId } of deriveAllThreadConversationIds(correlationId)) {
      derivedById.set(threadConversationId, { correlationId, gateId, kind: 'thread' });
    }
  }

  return conversations.flatMap((conversation) => {
    const source = derivedById.get(conversation.id);

    if (source == null) {
      return [];
    }

    const parentage = parentOf({
      correlationId: source.correlationId,
      ...(source.gateId == null ? {} : { gateId: source.gateId }),
      kind: source.kind,
    });

    return [
      {
        correlationId: source.correlationId,
        createdAt: conversation.created_at,
        // spread rather than `gateId: source.gateId`, so the three alert-keyed kinds omit the key
        // entirely instead of carrying an explicit `undefined` a client could render.
        ...(source.gateId == null ? {} : { gateId: source.gateId }),
        id: conversation.id,
        kind: source.kind,
        // same spread for parentage: container kinds omit the keys rather than sending no value.
        ...(parentage == null ? {} : parentage),
        title: stripKindTitlePrefix(conversation.title),
        updatedAt: conversation.updated_at,
      },
    ];
  });
};
