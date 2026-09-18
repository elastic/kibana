/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../../../common/endpoint/service/response_actions/constants';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { HostInfo } from '../../../../../common/endpoint/types';

export type { HostInfo };

/**
 * Schema bounds shared across the response-action tools. These limits keep
 * user/LLM input from generating oversized KQL queries or chat responses while
 * staying generous enough for real hostnames.
 */
export const MAX_HOSTNAME_LENGTH = 256;
export const MAX_HOSTNAME_FILTER_LENGTH = 256;
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
 * Bounds an action's raw `outputs` payload into a model-safe summary.
 *
 * The raw payload is unbounded (`execute`/`runscript` stdout/stderr, one
 * `get-processes` entry per process), so it is summarized rather than
 * forwarded: per-agent entry counts and truncation flags are always reported,
 * and only a bounded sample of entries is included.
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
    const totalEntries = entries?.length ?? 0;
    const keptEntries = entries ? entries.slice(0, MAX_OUTPUT_ENTRIES_PER_AGENT) : undefined;

    const truncatedFields: string[] = [];
    const bounded: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (key !== 'entries') {
        if (typeof value === 'string' && value.length > MAX_OUTPUT_STRING_LENGTH) {
          bounded[key] = `${value.slice(0, MAX_OUTPUT_STRING_LENGTH)}… [truncated, ${
            value.length - MAX_OUTPUT_STRING_LENGTH
          } more characters]`;
          truncatedFields.push(key);
        } else {
          bounded[key] = value;
        }
      }
    }

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
