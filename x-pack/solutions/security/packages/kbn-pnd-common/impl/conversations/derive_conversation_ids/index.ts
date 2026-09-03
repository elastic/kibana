/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';

import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '../../../constants';
// The reverse edge — `gate_registry` importing `PndConversationKind` from here — is `import type`,
// so it is erased at compile time and there is no runtime cycle between the two modules.
import {
  PND_GATE_REGISTRY,
  getGateDefinitionByGateId,
  type PndGateId,
} from '../../proposals/gate_registry';

/**
 * Deterministic UUIDv5 namespaces for the three PND Agent Builder conversations
 * derived from an Attack Discovery alert id — one per phase of the loop that opens
 * a thread: Investigation (phase 2), Incident (phase 3) and Tuning (phase 4).
 *
 * UUIDv5 is mandatory: `POST /converse` hard-validates conversation ids as UUIDs
 * (`agent_builder/server/routes/chat.ts:107`), so a non-UUID conversation can be
 * created but never replied to. Deriving the ids from the AD alert id keeps them
 * deterministic (re-triggering reuses the same conversation) and lets PND compute
 * the expected id set for a space's AD alerts without any stored title/tag/metadata.
 *
 * These namespace constants are fixed forever: changing any one of them silently
 * repoints every conversation to a new id, orphaning existing threads. Adding
 * {@link PND_TUNING_NAMESPACE} therefore had to leave the two pre-existing ids
 * byte-for-byte unchanged, which `index.test.ts` pins with literal values.
 *
 * There is a fourth namespace, {@link PND_THREAD_NAMESPACE}, and a fifth,
 * {@link PND_WORKER_NAMESPACE}, but both are keyed differently — thread on
 * `(correlationId, gateId)`, worker on `(correlationId, workerWorkflowId)` —
 * so they are deliberately not part of {@link deriveConversationIds}.
 */
export const PND_INVESTIGATION_NAMESPACE = 'a1f4c2e8-6b3d-4f9a-8c7e-2d5b9f0a1c34' as const;
export const PND_INCIDENT_NAMESPACE = 'b2e5d3f9-7c4e-4a0b-9d8f-3e6c0a1b2d45' as const;
export const PND_TUNING_NAMESPACE = 'c3f6e4a0-8d5f-4b1c-ae90-4f7d1b2c3e56' as const;

/**
 * The fourth namespace: `[Thread]`, the per-Proposal conversation (D1 / ADR-012).
 *
 * The three namespaces above are keyed on the Attack Discovery alert id alone, so each yields one
 * conversation per alert. A thread is keyed on `(correlationId, gateId)` instead, which is
 * byte-for-byte the key `dedupeProposals` already dedupes proposals on — so "one row per Proposal"
 * and "one thread per Proposal" are the same guarantee rather than two that could drift.
 *
 * Fixed forever, exactly like the other three: changing it silently repoints every thread to a new
 * id and orphans the conversations, attachments and messages already sitting at the old one.
 * Adding it had to leave the three pre-existing constants byte-for-byte unchanged, which
 * `index.test.ts` pins with literal values.
 */
export const PND_THREAD_NAMESPACE = 'd4a7f5b1-9e60-4c2d-bfa1-5a8e2c3d4f67' as const;

/**
 * The fifth namespace: a specialist worker conversation, keyed on
 * `(correlationId, workerWorkflowId)`.
 *
 * Additive — the four namespaces above stay byte-for-byte identical, which `index.test.ts` pins
 * with literal values. Deep Watch is the only registered worker today; append to
 * {@link PND_WORKER_WORKFLOW_IDS} to mint another.
 *
 * Fixed forever, exactly like the other four: changing it silently repoints every worker
 * conversation to a new id and orphans the conversations already sitting at the old one.
 */
export const PND_WORKER_NAMESPACE = 'e5b8c6c2-af72-4d3e-b0b2-7c0a4e5f6189' as const;

/**
 * Workflow ids that mint a conversation under {@link PND_WORKER_NAMESPACE}.
 *
 * Fail-closed: {@link deriveWorkerConversationId} returns no value for anything outside this
 * list, including the Floor and Post-Incident orchestrators. Those are not workers.
 */
export const PND_WORKER_WORKFLOW_IDS = [SYSTEM_SECURITY_WATCH_DEEP_ID] as const;

export type PndWorkerWorkflowId = (typeof PND_WORKER_WORKFLOW_IDS)[number];

/** The three derived conversation ids for a single Attack Discovery alert. */
export interface DerivedConversationIds {
  investigationConversationId: string;
  incidentConversationId: string;
  tuningConversationId: string;
}

/**
 * Derive the deterministic Investigation, Incident and Tuning conversation ids for an
 * Attack Discovery alert. All three outputs are valid UUIDv5 values, so all three are
 * chattable via `POST /converse`.
 *
 * **1:1 thin-slice divergence.** project-daybreak #137 decision 7 says incident↔investigation
 * is many-to-many. These ids key on a single Attack Discovery alert id, so the thin slice is
 * strictly one investigation and one incident per correlation key. Changing that would break
 * every derivation the projection rests on — including `promotedFrom`, which recovers the
 * originating investigation by re-deriving this same pair. Recorded here so `.16` can cite it.
 */
export const deriveConversationIds = (correlationId: string): DerivedConversationIds => ({
  incidentConversationId: uuidv5(correlationId, PND_INCIDENT_NAMESPACE),
  investigationConversationId: uuidv5(correlationId, PND_INVESTIGATION_NAMESPACE),
  tuningConversationId: uuidv5(correlationId, PND_TUNING_NAMESPACE),
});

/**
 * Which of the three alert-keyed PND conversation namespaces a conversation id belongs to.
 *
 * Deliberately **not** widened with a `'thread'` member when {@link PND_THREAD_NAMESPACE} was
 * added. This type does double duty as `PndGateDefinition.threadAgentKind` — "which of the three
 * installed PND agents answers this thread" — and there is no fourth agent (D3), so a `'thread'`
 * member would immediately be a legal value there and mean nothing. Surfaces that render a fourth
 * *badge* get it from the route contract's own `kind` enum instead.
 */
export type PndConversationKind = 'investigation' | 'incident' | 'tuning';

/** Arguments to {@link deriveThreadConversationId}. */
export interface DeriveThreadConversationIdArgs {
  correlationId: string;
  /**
   * A short gate id. Typed as `string` rather than `PndGateId` on purpose: this function is the
   * fail-closed boundary, so it must be callable with an unvalidated value straight off the wire
   * and answer `undefined` rather than mint an id for a gate that does not exist.
   */
  gateId: string;
}

/** One gate's thread id, as returned by {@link deriveAllThreadConversationIds}. */
export interface DerivedThreadConversationId {
  gateId: PndGateId;
  threadConversationId: string;
}

/**
 * Derive the deterministic `[Thread]` conversation id for one HITL proposal — the thread paired
 * 1:1 with the gate `gateId` on the Attack Discovery alert `correlationId`.
 *
 * The hashed input is `${correlationId}:${gateId}`, with the gate id as the **suffix**.
 * `gateId` is drawn from the closed {@link PND_GATE_REGISTRY} set and no member contains a `:`, so
 * the segment after the final `:` is always exactly the gate id and an alert id that itself
 * contains `:` can never produce an ambiguous split. The prefix form would put the unbounded,
 * externally-supplied value in the position that has to be recovered, which needs an assumption
 * about alert-id content that PND cannot make.
 *
 * **Fail-closed**, returning `undefined` rather than an id, when the alert id is blank or the gate
 * is not registered. An unknown gate must never mint a conversation id, because every PND surface
 * treats a derived id as PND-owned by construction — `_ensure` would create a real Agent Builder
 * conversation there, and the S11 guard would then accept it.
 */
export const deriveThreadConversationId = ({
  correlationId,
  gateId,
}: DeriveThreadConversationIdArgs): string | undefined => {
  if (correlationId.trim() === '') return undefined;
  if (getGateDefinitionByGateId(gateId) == null) return undefined;

  return uuidv5(`${correlationId}:${gateId}`, PND_THREAD_NAMESPACE);
};

/**
 * Every thread id for one Attack Discovery alert — one per registered gate, in registry order.
 *
 * The whole-set counterpart to {@link deriveThreadConversationId}, for the surfaces that need to
 * recognise *any* of an alert's threads rather than one: `buildPndConversations` (which intersects
 * the derived ids with the caller's Agent Builder conversations, so a thread it does not register
 * is invisible with no error anywhere) and the chats view.
 *
 * Fail-closed on a blank alert id, returning an empty array — inherited from
 * {@link deriveThreadConversationId} rather than re-checked here, so a degraded `derive_ids` cannot
 * widen the id set that downstream surfaces treat as PND-owned.
 */
export const deriveAllThreadConversationIds = (
  correlationId: string
): DerivedThreadConversationId[] =>
  // Routed through the single-gate derivation rather than re-implementing the hash, so the two can
  // never disagree about the input string, and `flatMap` keeps the fail-closed `undefined` case
  // honest without a non-null assertion.
  PND_GATE_REGISTRY.flatMap(({ gateId }) => {
    const threadConversationId = deriveThreadConversationId({ correlationId, gateId });

    return threadConversationId == null ? [] : [{ gateId, threadConversationId }];
  });

/** Arguments to {@link deriveWorkerConversationId}. */
export interface DeriveWorkerConversationIdArgs {
  correlationId: string;
  /**
   * A worker workflow id. Typed as `string` rather than {@link PndWorkerWorkflowId} on purpose:
   * this function is the fail-closed boundary, so it must be callable with an unvalidated value
   * and answer no value rather than mint an id for a workflow that is not a worker.
   */
  workerWorkflowId: string;
}

/** One worker's conversation id, as returned by {@link deriveAllWorkerConversationIds}. */
export interface DerivedWorkerConversationId {
  workerConversationId: string;
  workerWorkflowId: PndWorkerWorkflowId;
}

const WORKER_WORKFLOW_IDS: ReadonlySet<string> = new Set(PND_WORKER_WORKFLOW_IDS);

/**
 * Derive the deterministic worker conversation id for one specialist workflow on the Attack
 * Discovery alert `correlationId`.
 *
 * The hashed input is `${correlationId}:${workerWorkflowId}`, with the workflow id as
 * the **suffix** — the same ordering as {@link deriveThreadConversationId}. A worker conversation
 * is keyed on the workflow that owns it, so two workers on one alert cannot share an id.
 *
 * **Fail-closed**, returning no value, when the alert id is blank or the workflow is not in
 * {@link PND_WORKER_WORKFLOW_IDS}. An orchestrator id (Floor, Post-Incident) must never mint a
 * worker conversation.
 */
export const deriveWorkerConversationId = ({
  correlationId,
  workerWorkflowId,
}: DeriveWorkerConversationIdArgs): string | undefined => {
  if (correlationId.trim() === '') return undefined;
  if (!WORKER_WORKFLOW_IDS.has(workerWorkflowId)) return undefined;

  return uuidv5(`${correlationId}:${workerWorkflowId}`, PND_WORKER_NAMESPACE);
};

/**
 * Every worker conversation id for one Attack Discovery alert — one per registered worker
 * workflow, in {@link PND_WORKER_WORKFLOW_IDS} order.
 *
 * Fail-closed on a blank alert id, returning an empty array — inherited from
 * {@link deriveWorkerConversationId} rather than re-checked here.
 */
export const deriveAllWorkerConversationIds = (
  correlationId: string
): DerivedWorkerConversationId[] =>
  PND_WORKER_WORKFLOW_IDS.flatMap((workerWorkflowId) => {
    const workerConversationId = deriveWorkerConversationId({
      correlationId,
      workerWorkflowId,
    });

    return workerConversationId == null ? [] : [{ workerConversationId, workerWorkflowId }];
  });

/**
 * Classify a conversation id as `investigation`, `incident` or `tuning` by re-deriving
 * the expected id set from the caller's known Attack Discovery alert ids and matching.
 * Returns `undefined` when the id is not a PND-derived conversation for any of the
 * given alerts — the inverse-ish of {@link deriveConversationIds}, used to badge a
 * conversation in the UI.
 */
export const getPndConversationKind = (
  conversationId: string,
  correlationIds: readonly string[]
): PndConversationKind | undefined => {
  for (const correlationId of correlationIds) {
    const { incidentConversationId, investigationConversationId, tuningConversationId } =
      deriveConversationIds(correlationId);

    if (conversationId === investigationConversationId) return 'investigation';
    if (conversationId === incidentConversationId) return 'incident';
    if (conversationId === tuningConversationId) return 'tuning';
  }

  return undefined;
};
