/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext } from '@kbn/agent-builder-server';
import { getAgentFromRunContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '../../../../../common/endpoint/service/response_actions/constants';

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
  return {
    results: [
      {
        tool_result_id: getToolResultId(),
        type: ToolResultType.error as const,
        data: {
          error: 'insufficient_privileges' as const,
          privilege,
          message: `Insufficient privileges: this action requires the '${privilege}' endpoint privilege. Ask an administrator to grant it, or perform the action from the Security UI.`,
        },
      },
    ],
  };
}

/**
 * Reason codes that explain why an endpoint lookup produced a "not found" result.
 * The consumer (agent / caller) must distinguish these to choose the right
 * follow-up action.
 *
 * - endpoint_not_found: the host name was resolved to zero fleet agents.
 * - index_not_found:  the Elasticsearch index the metadata service queries
 *   does not exist (e.g. data stream was deleted or never provisioned).
 */
export type HostLookupReason = 'endpoint_not_found' | 'index_not_found';

/**
 * Shared return shape for the endpoint-status tool when the host could not be
 * found. All three inline tools (isolate, unisolate, status) use a
 * consistent `found` + `reason` pattern so the AI agent can branch on the
 * cause of a not-found outcome.
 */
export interface EndpointNotFoundResult {
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
