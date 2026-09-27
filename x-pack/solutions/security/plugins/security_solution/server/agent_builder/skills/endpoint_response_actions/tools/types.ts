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
 * Endpoints returned per page by `list_endpoints`. The tool exposes a `page`
 * parameter and reports `total`/`hasMore`, so a fleet larger than one page can
 * still be enumerated instead of being silently truncated.
 */
export const LIST_ENDPOINTS_PAGE_SIZE = 50;

/**
 * Bounds applied to response-action `outputs` before they reach the model.
 *
 * `outputs` is unbounded by design: `execute`/`runscript` carry stdout/stderr
 * that can reach tens of MB, and `get-processes` returns one entry per process.
 * Forwarding it raw lets a single lookup exhaust the conversation context, so
 * the tool returns a summary plus a bounded sample and reports what it dropped.
 */
export const MAX_OUTPUT_AGENTS = 10;
export const MAX_OUTPUT_ENTRIES_PER_AGENT = 20;
export const MAX_OUTPUT_STRING_LENGTH = 2000;

/**
 * Bounds for the object-valued part of an output. `ActionResponseOutput.content`
 * is an object (`{ canceled_by?, ...TOutputContent }`) whose `entries`, stdout
 * and stderr live one level deeper than the flat shape, so bounding only
 * top-level strings leaves the multi-MB payload unbounded. Nesting is walked to
 * a fixed depth and any value beyond it is serialized and truncated.
 */
export const MAX_OUTPUT_DEPTH = 4;
export const MAX_OUTPUT_OBJECT_KEYS = 50;

/**
 * Hosts and per-agent states reported for one action. A fan-out action carries
 * one entry per targeted agent, so a batch isolate injects thousands of records
 * into the model context unless they are bounded.
 */
export const MAX_ACTION_HOSTS = 50;
export const MAX_AGENT_STATE_ENTRIES = MAX_OUTPUT_AGENTS;

/**
 * Errors reported for one action. `getActionCompletionInfo` appends every
 * unsuccessful agent response's errors into this aggregate array, so a large
 * failed fan-out can carry thousands of entries (with arbitrarily long text)
 * even after hosts, outputs and agentState are capped.
 */
export const MAX_ACTION_ERRORS = 20;

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
 * Standard tool result returned when the caller lacks the endpoint privilege
 * required to read response-action state. The agent-dispatched path reuses the
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
 * Bounds one value of an output payload, whatever its shape.
 *
 * Returns the bounded value plus the paths that were truncated, so the model
 * is told what it is not seeing rather than silently receiving a partial
 * payload. Nested objects (`ActionResponseOutput.content`) and arrays are
 * walked; anything deeper than `MAX_OUTPUT_DEPTH` is serialized and truncated
 * as a string.
 */
function boundOutputValue(value: unknown, path: string, depth = 0): BoundedOutputValue {
  if (typeof value === 'string') {
    if (value.length > MAX_OUTPUT_STRING_LENGTH) {
      return {
        value: `${value.slice(0, MAX_OUTPUT_STRING_LENGTH)}… [truncated, ${
          value.length - MAX_OUTPUT_STRING_LENGTH
        } more characters]`,
        truncatedPaths: [path],
      };
    }

    return { value, truncatedPaths: [] };
  }

  if (Array.isArray(value)) {
    const kept = value
      .slice(0, MAX_OUTPUT_ENTRIES_PER_AGENT)
      .map((item, index) => boundOutputValue(item, `${path}[${index}]`, depth + 1));
    const dropped = value.length - kept.length;

    return {
      value: [
        ...kept.map((bounded) => bounded.value),
        ...(dropped > 0 ? [`… [truncated, ${dropped} more items]`] : []),
      ],
      truncatedPaths: [
        ...kept.flatMap((bounded) => bounded.truncatedPaths),
        ...(dropped > 0 ? [path] : []),
      ],
    };
  }

  if (value && typeof value === 'object') {
    if (depth >= MAX_OUTPUT_DEPTH) {
      return boundOutputValue(JSON.stringify(value) ?? String(value), path, depth + 1);
    }

    const entries = Object.entries(value as Record<string, unknown>);
    const kept = entries
      .slice(0, MAX_OUTPUT_OBJECT_KEYS)
      .map(
        ([key, entryValue]) =>
          [key, boundOutputValue(entryValue, `${path}.${key}`, depth + 1)] as const
      );

    return {
      value: Object.fromEntries(kept.map(([key, bounded]) => [key, bounded.value])),
      truncatedPaths: [
        ...kept.flatMap(([, bounded]) => bounded.truncatedPaths),
        ...(entries.length > kept.length ? [path] : []),
      ],
    };
  }

  return { value, truncatedPaths: [] };
}

/**
 * Bounds an action's raw `outputs` payload into a model-safe summary.
 *
 * The raw payload is unbounded (`execute`/`runscript` stdout/stderr, one
 * `get-processes` entry per process), so it is summarized rather than
 * forwarded: per-agent entry counts and truncation flags are always reported,
 * and only a bounded sample of entries is included. Bounding is recursive —
 * the real production shape nests the payload under `content`, so a
 * top-level-only bound leaves it unbounded.
 */
export function summarizeActionOutputs(outputs: unknown): ActionOutputsSummary | undefined {
  if (!outputs || typeof outputs !== 'object') {
    return undefined;
  }

  const byAgent = outputs as Record<string, unknown>;
  const agentIds = Object.keys(byAgent);
  const includedAgentIds = agentIds.slice(0, MAX_OUTPUT_AGENTS);

  const agents: ActionOutputAgentSummary[] = includedAgentIds.map((agentId) => {
    const raw = byAgent[agentId];
    const record = (raw ?? {}) as Record<string, unknown>;
    const entries = Array.isArray(record.entries) ? (record.entries as unknown[]) : undefined;

    const truncatedFields: string[] = [];
    const bounded: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key !== 'entries') {
        const boundedValue = boundOutputValue(value, key);
        bounded[key] = boundedValue.value;
        truncatedFields.push(...boundedValue.truncatedPaths);
      }
    }

    // Each kept entry is bounded individually rather than by bounding the
    // array: a marker element would change the shape callers already read,
    // and the drop count is reported separately by `entriesTruncated`.
    const keptEntries = entries?.slice(0, MAX_OUTPUT_ENTRIES_PER_AGENT).map((entry, index) => {
      const boundedEntry = boundOutputValue(entry, `entries[${index}]`);
      truncatedFields.push(...boundedEntry.truncatedPaths);

      return boundedEntry.value;
    });

    const totalEntries = entries?.length ?? 0;

    return {
      agentId,
      ...bounded,
      ...(keptEntries
        ? {
            entries: keptEntries,
            totalEntries,
            ...(totalEntries > keptEntries.length
              ? { entriesTruncated: totalEntries - keptEntries.length }
              : {}),
          }
        : {}),
      ...(truncatedFields.length ? { truncatedFields } : {}),
    };
  });

  return {
    agents,
    totalAgents: agentIds.length,
    ...(agentIds.length > includedAgentIds.length
      ? { agentsTruncated: agentIds.length - includedAgentIds.length }
      : {}),
  };
}

/**
 * Bounds `ActionDetails.hosts` — one entry per targeted agent — into a record
 * that keeps the tool's existing shape while reporting how many hosts were
 * dropped.
 */
export function summarizeActionHosts(hosts: unknown): ActionHostsSummary | undefined {
  if (!hosts || typeof hosts !== 'object') {
    return undefined;
  }

  const byAgentId = Object.entries(hosts as Record<string, unknown>);
  const kept = byAgentId.slice(0, MAX_ACTION_HOSTS);

  return {
    hosts: Object.fromEntries(kept),
    totalHosts: byAgentId.length,
    ...(byAgentId.length > kept.length ? { hostsTruncated: byAgentId.length - kept.length } : {}),
  };
}

/**
 * Bounds `ActionDetails.agentState` — one entry per targeted agent, which is
 * what makes per-host completion visible for a fan-out action — and reports
 * how many per-agent states were dropped.
 */
export function summarizeAgentState(agentState: unknown): AgentStateSummary | undefined {
  if (!agentState || typeof agentState !== 'object') {
    return undefined;
  }

  const byAgentId = Object.entries(agentState as Record<string, unknown>);
  const kept = byAgentId.slice(0, MAX_AGENT_STATE_ENTRIES);

  return {
    agentState: Object.fromEntries(
      kept.map(([agentId, state]) => [agentId, boundOutputValue(state, agentId).value])
    ),
    totalAgents: byAgentId.length,
    ...(byAgentId.length > kept.length ? { agentsTruncated: byAgentId.length - kept.length } : {}),
  };
}

/**
 * Bounds `ActionDetails.errors` — the aggregate list of error strings from
 * every unsuccessful agent in a fan-out — and reports how many were dropped.
 * Entries are additionally string-truncated through the same value bounder the
 * other output fields use, since one agent's error text is unbounded.
 */
export function summarizeActionErrors(errors: unknown): ActionErrorsSummary | undefined {
  if (!Array.isArray(errors)) {
    return undefined;
  }

  const kept = errors.slice(0, MAX_ACTION_ERRORS);

  return {
    errors: kept.map((entry, index) => boundOutputValue(entry, `errors[${index}]`).value),
    totalErrors: errors.length,
    ...(errors.length > kept.length ? { errorsTruncated: errors.length - kept.length } : {}),
  };
}

interface BoundedOutputValue {
  value: unknown;
  truncatedPaths: string[];
}

export interface ActionHostsSummary {
  hosts: Record<string, unknown>;
  totalHosts: number;
  hostsTruncated?: number;
}

export interface AgentStateSummary {
  agentState: Record<string, unknown>;
  totalAgents: number;
  agentsTruncated?: number;
}

export interface ActionErrorsSummary {
  errors: unknown[];
  totalErrors: number;
  errorsTruncated?: number;
}

export interface ActionOutputAgentSummary {
  agentId: string;
  entries?: unknown[];
  totalEntries?: number;
  entriesTruncated?: number;
  truncatedFields?: string[];
  [key: string]: unknown;
}

export interface ActionOutputsSummary {
  agents: ActionOutputAgentSummary[];
  totalAgents: number;
  agentsTruncated?: number;
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
