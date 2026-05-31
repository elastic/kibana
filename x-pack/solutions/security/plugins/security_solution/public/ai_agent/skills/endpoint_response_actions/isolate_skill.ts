/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIntent } from './intent_parser';
import { resolveHost } from './host_resolver';
import { executeAction, pollActionStatus } from './action_client';
import type { ActionIntent, ActionResult, ActionType, HostRef } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The status of a skill response.
 *
 * - `needs_confirmation` – the skill has resolved the target host and is
 *   waiting for the analyst to confirm before executing the action.
 * - `ambiguous` – multiple hosts matched the input; the analyst must
 *   disambiguate before the skill can proceed.
 * - `not_found` – no host matched the input.
 * - `already_isolated` – the host is already in the desired isolation state.
 * - `executing` – the action has been submitted and is being polled.
 * - `completed` – the action finished successfully.
 * - `failed` – the action failed or timed out.
 * - `cancelled` – the analyst cancelled the confirmation step.
 * - `unrecognised` – the message did not match any known intent pattern.
 */
export type SkillStatus =
  | 'needs_confirmation'
  | 'ambiguous'
  | 'not_found'
  | 'already_isolated'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'unrecognised';

/** Structured response returned by the skill handler at each step. */
export interface SkillResponse {
  status: SkillStatus;
  /** Human-readable message suitable for display in the chat thread. */
  message: string;
  /** The parsed intent, when available. */
  intent?: ActionIntent;
  /** The resolved host, when exactly one match was found. */
  host?: HostRef;
  /** Candidate hosts returned when the query matched more than one host. */
  candidates?: HostRef[];
  /** The final action result, available once execution has completed or failed. */
  result?: ActionResult;
}

/**
 * Context provided to the skill handler.
 *
 * Currently this is intentionally minimal; additional fields (e.g. current
 * user, case ID) can be added as later slices require them.
 */
export interface SkillContext {
  /** When `true` the analyst has already confirmed the pending action. */
  confirmed?: boolean;
}

// ---------------------------------------------------------------------------
// Skill descriptor
// ---------------------------------------------------------------------------

/** Unique identifier for this skill, used during registration. */
export const ISOLATE_SKILL_ID = 'security.endpoint_response_actions.isolate' as const;

/** Display name shown in the AI Agent skill picker. */
export const ISOLATE_SKILL_NAME = 'Isolate / Un-isolate Host' as const;

// ---------------------------------------------------------------------------
// Main skill handler
// ---------------------------------------------------------------------------

/**
 * Main handler that composes the full isolate/unisolate skill pipeline:
 *
 * 1. Parse  – extract intent (action type + hostname) from natural language.
 * 2. Resolve – look up the host via the endpoint metadata API.
 * 3. Confirm – return a `needs_confirmation` response so the UI can render
 *              the ConfirmationCard.  On re-invocation with `confirmed: true`
 *              the flow continues to step 4.
 * 4. Execute – submit the Response Action (isolate / unisolate).
 * 5. Result  – poll for the final action status and return it.
 *
 * @param message  Raw natural-language message from the analyst.
 * @param context  Runtime context; set `confirmed: true` to proceed past the
 *                 confirmation gate.
 * @returns A `SkillResponse` describing the current state of the pipeline.
 */
export const handleIsolateSkill = async (
  message: string,
  context: SkillContext = {}
): Promise<SkillResponse> => {
  // ------------------------------------------------------------------
  // Step 1 – Parse intent
  // ------------------------------------------------------------------
  const intent = parseIntent(message);

  if (!intent) {
    return {
      status: 'unrecognised',
      message:
        "I didn't recognise an isolate or un-isolate command in your message. " +
        'Try something like "Isolate WIN-PROD-042" or "Unisolate WIN-PROD-042".',
    };
  }

  // ------------------------------------------------------------------
  // Step 2 – Resolve host
  // ------------------------------------------------------------------
  let hosts: HostRef[];
  try {
    hosts = await resolveHost({ searchString: intent.hostName });
  } catch (err) {
    const message_ = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 'failed',
      message: `Failed to look up host "${intent.hostName}": ${message_}`,
      intent,
    };
  }

  if (hosts.length === 0) {
    return {
      status: 'not_found',
      message:
        `I don't see a host matching "${intent.hostName}". ` +
        'Please check the hostname and try again.',
      intent,
    };
  }

  if (hosts.length > 1) {
    const candidateList = hosts
      .slice(0, 3)
      .map((h) => `"${h.hostName}" (agent ${h.agentId})`)
      .join(', ');
    return {
      status: 'ambiguous',
      message:
        `"${intent.hostName}" matches multiple hosts: ${candidateList}. ` +
        'Please use a more specific name.',
      intent,
      candidates: hosts,
    };
  }

  const host = hosts[0];

  // ------------------------------------------------------------------
  // Guard: already in the desired isolation state
  // ------------------------------------------------------------------
  if (intent.type === 'isolate' && host.isIsolated) {
    return {
      status: 'already_isolated',
      message: `"${host.hostName}" is already isolated.`,
      intent,
      host,
    };
  }

  if (intent.type === 'unisolate' && !host.isIsolated) {
    return {
      status: 'already_isolated',
      message: `"${host.hostName}" is not currently isolated.`,
      intent,
      host,
    };
  }

  // ------------------------------------------------------------------
  // Step 3 – Confirmation gate
  // ------------------------------------------------------------------
  if (!context.confirmed) {
    return {
      status: 'needs_confirmation',
      message:
        `About to ${intent.type} host "${host.hostName}" (agent ${host.agentId}). ` +
        'Please confirm to proceed.',
      intent,
      host,
    };
  }

  // ------------------------------------------------------------------
  // Step 4 – Execute action
  // ------------------------------------------------------------------
  let actionId: string;
  try {
    ({ actionId } = await executeAction(intent.type as ActionType, host.agentId));
  } catch (err) {
    const message_ = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 'failed',
      message: `Failed to submit ${intent.type} action for "${host.hostName}": ${message_}`,
      intent,
      host,
    };
  }

  // ------------------------------------------------------------------
  // Step 5 – Poll result
  // ------------------------------------------------------------------
  let actionResult: ActionResult;
  try {
    actionResult = await pollActionStatus(actionId);
  } catch (err) {
    const message_ = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 'failed',
      message:
        `Action ${actionId} was submitted but status could not be retrieved: ${message_}`,
      intent,
      host,
      result: {
        actionId,
        status: 'failed',
        errorMessage: message_,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const skillStatus: SkillStatus =
    actionResult.status === 'completed'
      ? 'completed'
      : actionResult.status === 'failed'
      ? 'failed'
      : 'executing';

  const verb = intent.type === 'isolate' ? 'Isolation' : 'Un-isolation';
  const statusText =
    actionResult.status === 'completed'
      ? 'completed successfully'
      : actionResult.status === 'failed'
      ? `failed${actionResult.errorMessage ? `: ${actionResult.errorMessage}` : ''}`
      : 'is in progress';

  return {
    status: skillStatus,
    message: `${verb} of "${host.hostName}" (action ${actionId}) ${statusText}.`,
    intent,
    host,
    result: actionResult,
  };
};

// ---------------------------------------------------------------------------
// Skill object — consumed by the registration layer (index.ts)
// ---------------------------------------------------------------------------

/**
 * Skill descriptor exported for registration with the AI Agent framework.
 *
 * The `handle` function is the entry point; callers supply a raw message and
 * optional context.  The registration layer is responsible for mapping the
 * returned `SkillResponse` to the appropriate chat UI component
 * (ConfirmationCard, ResultCard, or a plain text message).
 */
export const isolateSkill = {
  id: ISOLATE_SKILL_ID,
  name: ISOLATE_SKILL_NAME,
  description:
    'Isolate or un-isolate an endpoint host via natural language. ' +
    'Requires confirmation before executing the response action.',
  handle: handleIsolateSkill,
} as const;
