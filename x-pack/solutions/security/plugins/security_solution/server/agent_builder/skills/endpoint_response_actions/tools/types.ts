/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { Logger } from '@kbn/logging';
import type { RunContext } from '@kbn/agent-builder-server';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../../../common/endpoint/service/response_actions/constants';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { ActionDetails, HostInfo } from '../../../../../common/endpoint/types';
import type { EndpointAppContextService } from '../../../../endpoint/endpoint_app_context_services';
import { getActionDetailsById } from '../../../../endpoint/services/actions';

export type { HostInfo };

/**
 * Schema bounds shared across the response-action tools. These limits keep
 * user/LLM input from generating oversized KQL queries, action payloads, or
 * chat responses while staying generous enough for real hostnames and paths.
 */
export const MAX_HOSTNAME_LENGTH = 256;
export const MAX_HOSTNAME_FILTER_LENGTH = 256;
export const MAX_FILE_PATH_LENGTH = 4096;
export const MAX_ACTION_COMMENT_LENGTH = 2048;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Typed error codes for all response-action tools. Keeping a closed union lets
 * the AI agent branch on the failure cause and gives the frontend a stable
 * contract instead of free-text messages.
 */
export type ResponseActionErrorType =
  | 'insufficient_privileges'
  | 'endpoint_not_found'
  | 'action_not_found'
  | 'feature_disabled'
  | 'unknown_error';

/**
 * Builds a typed error result. The optional `extra` fields are merged at the
 * top level of `data` so existing consumers (e.g. `insufficientPrivilegesResult`)
 * can keep the `privilege` field where tests already expect it.
 */
export function responseActionErrorResult(
  error: ResponseActionErrorType,
  message: string,
  extra?: Record<string, unknown>
) {
  return {
    results: [
      {
        tool_result_id: getToolResultId(),
        type: ToolResultType.error as const,
        data: {
          error,
          message,
          ...extra,
        },
      },
    ],
  };
}

/**
 * Builds the comment recorded on a dispatched response action so its entry in
 * the Response Actions audit log links back to the originating agent
 * conversation. The conversation id (falling back to the always-present run id
 * used for tracing) is the correlation anchor; the endpoint action document has
 * no structured "source conversation" field, so the free-text comment — the
 * established place for analyst context — carries it.
 *
 * The conversation id lives on the agent entry of the run-context stack, so it
 * is resolved via `getAgentFromRunContext`. An analyst-supplied comment is
 * preserved and the anchor is appended to it.
 */
export function buildResponseActionComment(
  defaultComment: string,
  runContext: RunContext,
  analystComment?: string
): string {
  const base = analystComment ?? defaultComment;
  const correlationId = getAgentFromRunContext(runContext)?.conversationId ?? runContext.runId;
  return correlationId ? `${base} [AI agent conversation: ${correlationId}]` : base;
}

/**
 * Standard tool result returned when the caller lacks the endpoint privilege
 * required to dispatch a response action. The agent-dispatched path reuses the
 * platform's internal (automated) response-actions client, which does not run
 * the per-user privilege checks the HTTP routes enforce — so each tool must
 * assert the caller's endpoint authz (via `getEndpointAuthz(request)`) itself
 * and return this when the privilege is absent, mirroring the route's
 * `withEndpointAuthz(...)` gate.
 */
export function insufficientPrivilegesResult(privilege: string) {
  return responseActionErrorResult(
    'insufficient_privileges',
    `Insufficient privileges: this action requires the '${privilege}' endpoint privilege. Ask an administrator to grant it, or perform the action from the Security UI.`,
    { privilege }
  );
}

/**
 * Reason codes that explain why an endpoint lookup produced a "not found" result.
 *
 * - endpoint_not_found: the host name was resolved to zero fleet agents.
 */
export type HostLookupReason = 'endpoint_not_found';

/**
 * Shared return shape for the endpoint-status tool when the host could not be
 * found. All host-lookup tools use a consistent `found` + `reason` pattern so
 * the AI agent can branch on the cause of a not-found outcome.
 */
export interface EndpointNotFoundResult {
  /**
   * Stable marker letting the frontend identify response-action tool
   * results without colliding with the many other skills that also return
   * `ToolResultType.other` (see `isResponseActionResult` type guard).
   */
  kind: 'response_action_result';
  hostName: string;
  found: false;
  reason: HostLookupReason;
  status: string;
  isolated: false;
  lastSeen: null;
  /** Human-readable explanation for the agent's response text. */
  message: string;
}

/**
 * Builds a consistent "endpoint not found" data object for tools that return
 * `ToolResultType.other`.
 */
export function endpointNotFoundData(hostName: string): EndpointNotFoundResult {
  return {
    kind: 'response_action_result' as const,
    hostName,
    found: false,
    reason: 'endpoint_not_found' as const,
    status: HostStatus.OFFLINE,
    isolated: false,
    lastSeen: null,
    message: `No endpoint found with hostname '${hostName}'.`,
  };
}

/**
 * Resolves the response-actions `agentType` for a Fleet agent from its
 * installed integration packages, mirroring
 * `RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES` — the same map the REST API
 * consults, except the REST API gets `agent_type` as an explicit request
 * field while these chat-driven tools only resolve a hostname to a Fleet
 * agent. The installed package list is the only signal available to tell
 * Elastic Defend apart from a 3rd-party EDR (SentinelOne, CrowdStrike,
 * Microsoft Defender for Endpoint), so this keeps multi-vendor parity with
 * the REST API instead of hardcoding `'endpoint'`.
 *
 * Defaults to `endpoint` when no known integration package is found, since
 * that keeps prior single-vendor behavior for hosts without a resolvable
 * package list.
 */
export function resolveAgentTypeFromPackages(packages: string[] = []): ResponseActionAgentType {
  for (const [agentType, packageNames] of Object.entries(
    RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES
  )) {
    if (packageNames.some((packageName) => packages.includes(packageName))) {
      return agentType as ResponseActionAgentType;
    }
  }

  return 'endpoint';
}

/**
 * Retry/timeout budget for {@link waitForActionCompletion}. Elastic Defend
 * dispatches a fleet action and returns immediately — the endpoint agent
 * typically takes anywhere from a few seconds up to ~90s to check in, execute
 * the action, and write its response back. Without polling, a tool returns
 * whatever status was true the instant the action document was written
 * (almost always `pending`), which is what the chat UI showed for
 * `running-processes`, `isolate`, `unisolate`, and `scan` before this fix.
 *
 * 300ms → 480ms → 768ms → ... doubling, capped at 5s, for up to ~85s total —
 * long enough to observe real completions without holding the agent turn
 * open indefinitely (the agent-builder execution runner's own idle/overall
 * timeouts, `FOLLOW_EXECUTION_IDLE_TIMEOUT_MS` / `FOLLOW_EXECUTION_TIMEOUT_MS`,
 * are both several minutes, so this budget sits comfortably inside them).
 */
const ACTION_COMPLETION_POLL_CONFIG = {
  retries: 20,
  minTimeout: 300,
  maxTimeout: 5000,
  factor: 1.6,
};

/**
 * Polls `getActionDetailsById` until the dispatched response action reaches
 * a terminal state (`successful`, `failed`, or `canceled`) or the retry
 * budget is exhausted, then returns whatever the latest fetch produced.
 *
 * This mirrors the polling pattern the Microsoft Defender for Endpoint
 * client already uses (`p-retry` in `ms_defender_endpoint_actions_client.ts`)
 * and the polling the console UI does client-side via
 * `useConsoleActionSubmitter` (`ACTION_DETAILS_REFRESH_INTERVAL`) — the agent
 * tools had neither, so they surfaced the action's write-time snapshot
 * instead of its outcome.
 *
 * Never throws: on error or exhausted retries it returns the last known
 * `ActionDetails` (still `pending`) so the tool can report an honest,
 * non-final status rather than failing the whole tool call.
 */
export async function waitForActionCompletion<T extends ActionDetails = ActionDetails>(
  endpointAppContextService: EndpointAppContextService,
  spaceId: string,
  actionId: string,
  logger: Logger
): Promise<T> {
  let lastKnown: T | undefined;

  try {
    return await pRetry(
      async () => {
        const actionDetails = await getActionDetailsById<T>(
          endpointAppContextService,
          spaceId,
          actionId,
          // bypassSpaceValidation is safe here: the action was already
          // validated to be in the caller's space before dispatch (see
          // endpoint_lookup.ts -> ensureInCurrentSpace). Polling just reads
          // back the action we already dispatched.
          { bypassSpaceValidation: true }
        );
        lastKnown = actionDetails;

        if (!actionDetails.isCompleted) {
          throw new Error(`Action [${actionId}] is still pending`);
        }

        return actionDetails;
      },
      {
        ...ACTION_COMPLETION_POLL_CONFIG,
        onFailedAttempt: ({ attemptNumber, retriesLeft }) => {
          logger.debug(
            `Waiting for action [${actionId}] to complete (attempt ${attemptNumber}, ${retriesLeft} retries left)`
          );
        },
      }
    );
  } catch (error) {
    if (lastKnown) {
      return lastKnown;
    }

    logger.error(`Failed to fetch completion status for action [${actionId}]: ${error.message}`);
    throw error;
  }
}
