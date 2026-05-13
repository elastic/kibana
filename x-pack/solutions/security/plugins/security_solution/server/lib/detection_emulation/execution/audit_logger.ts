/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActorContext } from './audit_context';
import { isAgentBuilderActor } from './audit_context';

/**
 * Audit-trail comment helpers for detection emulation actions.
 *
 * The runner injects the result of `buildEmulationComment` into the
 * `comment` field of every Response Actions request. The comment lands
 * in the response_actions audit trail, which is how operators trace a
 * dispatched action back to the emulation that produced it.
 *
 * (The previous version of this module also exported `buildEmulationReason`,
 * `parseEmulationReason`, `isEmulationReason`, and `enrichWithEmulationContext`.
 * They were never called by any production code and have been removed.
 * Use `buildEmulationComment` for everything.)
 */

/**
 * Format the actor context as a stable, grep-friendly suffix.
 *
 * Contract:
 *   - For `actor.kind === 'user'` we emit nothing — the SO already
 *     records the operator and the comment stays terse.
 *   - For `actor.kind === 'agent-builder'` we emit `via=agent-builder`
 *     plus any of `conv=`, `exec=`, `run=`, `tool-call=` that have a
 *     value. Auditors can grep `via=agent-builder` to find every
 *     dispatch a tool produced.
 *
 * The fields are space-separated and key-prefixed so trailing values
 * never collide with other text appended to the comment.
 */
const formatActorSuffix = (actor: ActorContext): string => {
  if (!isAgentBuilderActor(actor)) {
    return '';
  }
  const parts: string[] = ['via=agent-builder'];
  if (actor.conversationId) parts.push(`conv=${actor.conversationId}`);
  if (actor.executionId) parts.push(`exec=${actor.executionId}`);
  if (actor.runId) parts.push(`run=${actor.runId}`);
  if (actor.toolCallId) parts.push(`tool-call=${actor.toolCallId}`);
  return parts.join(' ');
};

/**
 * Build a standardized comment string for an emulation-dispatched
 * Response Action. The format is intentionally stable so audit
 * consumers can grep for `Detection Emulation [<id>]:`.
 *
 * @param emulationId - unique identifier for the emulation run
 * @param command - the response-action command being dispatched
 * @param userComment - optional caller-supplied note to append
 * @param actor - optional actor context. When `kind === 'agent-builder'`,
 *   the resulting comment carries an `[via=agent-builder ...]` suffix
 *   so the audit trail is self-describing for human reviewers.
 */
export function buildEmulationComment(
  emulationId: string,
  command: string,
  userComment?: string,
  actor?: ActorContext
): string {
  const baseComment = `Detection Emulation [${emulationId}]: ${command}`;
  const withUser = userComment ? `${baseComment} - ${userComment}` : baseComment;
  if (!actor) {
    return withUser;
  }
  const actorSuffix = formatActorSuffix(actor);
  return actorSuffix ? `${withUser} [${actorSuffix}]` : withUser;
}
