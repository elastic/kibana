/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/agent-builder-server/runner/runner';

/**
 * Discriminated audit context describing WHO triggered an emulation
 * dispatch. Persisted on the `detection-emulation-report` SO and
 * embedded in the `comment` of every dispatched response action so an
 * auditor can always answer the question "did a human ask for this, or
 * did an agent dispatch it on the user's behalf?"
 *
 * - `kind: 'user'` — a direct REST call from a human-controlled session
 *   (Kibana UI, Endpoint UI, curl with personal API key). No additional
 *   correlation IDs are needed; the SO already carries `operator`.
 *
 * - `kind: 'agent-builder'` — dispatched by a tool running inside the
 *   Agent Builder runtime. The conversation / execution / run / tool-
 *   call IDs make it possible to pivot from a single response action in
 *   the audit trail back to (a) the conversation the user was having,
 *   (b) the specific agent run, (c) the specific tool invocation.
 *
 * Extending this union later (e.g. `kind: 'workflow'`, `kind: 'mcp'`)
 * is intentionally cheap — the SO migration only needs `mappings_addition`
 * for any new fields plus a forward-compatible string literal on
 * `actor.kind`.
 */
export type ActorContext =
  | { kind: 'user' }
  | {
      kind: 'agent-builder';
      /** From {@link RunAgentStackEntry.conversationId} — only set inside a chat. */
      conversationId?: string;
      /** From {@link RunAgentStackEntry.executionId} — per agent invocation. */
      executionId?: string;
      /** Always present on the runtime context — top-level run identifier. */
      runId?: string;
      /** Per individual tool call — uniquely identifies one dispatch. */
      toolCallId?: string;
    };

/**
 * Build an `agent-builder` actor context from the runtime context that
 * Agent Builder hands a tool. We walk the stack from most-recent to
 * oldest looking for the closest `agent` entry — nested skill / sub-
 * agent calls produce additional `agent` frames and we want the one
 * that owns the current tool call.
 *
 * Caller must already know it's running inside Agent Builder (i.e. is a
 * tool handler, not a REST route). For REST callers, use
 * `{ kind: 'user' }` directly.
 */
export const buildAgentBuilderActor = (
  runContext: RunContext,
  toolCallId: string | undefined
): Extract<ActorContext, { kind: 'agent-builder' }> => {
  const agentEntry = [...runContext.stack].reverse().find((entry) => entry.type === 'agent');

  return {
    kind: 'agent-builder',
    conversationId: agentEntry?.type === 'agent' ? agentEntry.conversationId : undefined,
    executionId: agentEntry?.type === 'agent' ? agentEntry.executionId : undefined,
    runId: runContext.runId,
    toolCallId,
  };
};

/**
 * Type guard that narrows to the agent-builder branch. Useful at the
 * SO-write boundary where we want to keep the optional fields tightly
 * scoped.
 */
export const isAgentBuilderActor = (
  actor: ActorContext
): actor is Extract<ActorContext, { kind: 'agent-builder' }> => actor.kind === 'agent-builder';
