/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  deriveAllThreadConversationIds,
  deriveConversationIds,
  type PndConversation,
  type PndGateId,
} from '@kbn/pnd-common';

/** What a PND-owned conversation id is, recovered from the namespace that produced it. */
export interface DerivedConversationIdentity {
  /**
   * The gate whose proposal a thread is paired with. Present only on a `thread` id: the three
   * alert-keyed kinds are derived from the alert id alone and have no gate (D1).
   */
  gateId?: PndGateId;
  kind: PndConversation['kind'];
}

/**
 * Every conversation id PND owns for one Attack Discovery alert, keyed by id.
 *
 * **Seven ids, not three.** Three come from the alert-keyed namespaces (`investigation`,
 * `incident`, `tuning`) and four from the gate-keyed `[Thread]` namespace — one per gate in
 * `PND_GATE_REGISTRY`, because a thread is keyed on `(correlationId, gateId)` (D1). This is
 * byte-for-byte the same set `buildPndConversations` intersects the caller's Agent Builder
 * conversations against, so the list route and the per-conversation routes can never disagree about
 * what PND owns.
 *
 * **Fail-closed on a blank alert id**, returning an empty map. `deriveConversationIds` will happily
 * hash `''` into three real UUIDs — it is a pure derivation with no notion of a caller — so without
 * this check a request carrying `correlationId: ''` plus the three ids that hash from it
 * would authorize itself against conversations no discovery owns. `deriveThreadConversationId`
 * already fails closed the same way; this makes the whole set behave alike.
 */
export const derivePndOwnedConversationIds = (
  correlationId: string
): Map<string, DerivedConversationIdentity> => {
  if (correlationId.trim() === '') {
    return new Map();
  }

  const { incidentConversationId, investigationConversationId, tuningConversationId } =
    deriveConversationIds(correlationId);

  return new Map<string, DerivedConversationIdentity>([
    [investigationConversationId, { kind: 'investigation' }],
    [incidentConversationId, { kind: 'incident' }],
    [tuningConversationId, { kind: 'tuning' }],
    ...deriveAllThreadConversationIds(correlationId).map(
      ({ gateId, threadConversationId }): [string, DerivedConversationIdentity] => [
        threadConversationId,
        { gateId, kind: 'thread' },
      ]
    ),
  ]);
};

/** Verdict of the S11 guard: what the id is, or nothing at all. */
export type GuardDerivedConversationIdResult =
  | ({ authorized: true } & DerivedConversationIdentity)
  | { authorized: false };

export interface GuardDerivedConversationIdParams {
  /** The Attack Discovery alert the caller claims the conversation belongs to. */
  correlationId: string;
  /** The conversation id the caller wants to act on. */
  conversationId: string;
  /** `RouteDependencies.logger` — already `[kibana-pnd]`-stamped. A rejection is never silent. */
  logger: Logger;
}

/**
 * **Security finding S11.** Assert that `conversationId` is one of the seven ids PND derives from
 * `correlationId`, so a PND conversation route can never become a generic Agent Builder
 * CRUD proxy.
 *
 * Every new conversation route (`_ensure`, `GET`/`DELETE /conversations/{id}`,
 * `POST /conversations/{id}/_rename`, `GET /conversations/{id}/attachments`) requires an
 * `correlationId` alongside the conversation id and runs this guard before touching Agent
 * Builder. Without it, a holder of the PND privileges could name *any* conversation id — including
 * another analyst's private Agent Builder conversation — and have PND act on it under their own
 * identity. Requiring the pair, and checking membership, means the only ids reachable through PND
 * are the ones PND itself mints.
 *
 * **It is a derivation check, not a readability check, and both are needed.** This guard proves the
 * id is PND-owned; it proves nothing about whether the caller may read the discovery it is derived
 * from. Pair it with the same `findAttackDiscoveryAlerts({ ids: [correlationId] })` resolve
 * that `_derive` and `_ensure` use (security finding S3), which answers as the calling user and lets
 * the route `404` a discovery the caller cannot read.
 *
 * **Two Agent Builder controls below this one are inherited, not re-implemented** — documenting them
 * here so nobody "fixes" them into something weaker:
 *
 * - `client.exists()` is space-filtered but **not** access-filtered
 *   (`agent_builder/.../conversations/client.ts` → `getDocument`), and `getConversation` then `get()`s
 *   with `access: 'converse'`. So an id that exists but the caller cannot read **404s instead of
 *   being created** — the strongest IDOR control in this stack, and PND gets it for free by going
 *   over HTTP as the caller (D7) rather than with an internal client.
 * - `create` uses `op_type: 'create'`. The public create route maps a version conflict to
 *   **409**; `_ensure` treats that as the D6 concurrent-create case. A post-failure re-read still
 *   covers other non-2xx answers, in case a concurrent creator won through another path.
 *
 * Fail-closed by construction: an unknown id, an id belonging to another discovery, and a blank
 * alert id all answer `{ authorized: false }`, and every rejection is logged at `warn` — a route
 * called from a workflow step with `on-failure: { continue: true }` is otherwise invisible when it
 * refuses (finding R4).
 */
export const guardDerivedConversationId = ({
  correlationId,
  conversationId,
  logger,
}: GuardDerivedConversationIdParams): GuardDerivedConversationIdResult => {
  const identity = derivePndOwnedConversationIds(correlationId).get(conversationId);

  if (identity == null) {
    logger.warn(
      `Refusing to act on conversation "${conversationId}": it is not derived from Attack Discovery alert "${correlationId}", so it is not a PND conversation (security finding S11)`
    );
    return { authorized: false };
  }

  return { authorized: true, ...identity };
};
