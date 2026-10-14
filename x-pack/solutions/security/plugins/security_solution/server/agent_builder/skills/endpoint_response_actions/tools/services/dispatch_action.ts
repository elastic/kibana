/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAuthz } from '../../../../../../common/endpoint/types/authz';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { responseActionErrorResult, insufficientPrivilegesResult } from '../types';
import { createEndpointLookupService, type ResolvedEndpoint } from './endpoint_lookup';
import {
  resolveDispatchTarget,
  type DispatchActionName,
  type ResolvedDispatchTarget,
} from './resolve_target';

/**
 * Response-action agent types this skill may dispatch to.
 *
 * Scoped to Elastic Defend on purpose. The lookup resolves *Fleet* agents by
 * `local_metadata.host.name`, and the two dispatching paths disagree about what
 * an "endpoint id" is: Defend endpoints and Fleet agents share an id, while for
 * the SentinelOne / CrowdStrike / Microsoft Defender integrations the Fleet
 * agent is the collector polling the vendor API and the vendor client expects
 * the EDR's own agent id (e.g. `SentinelOneActionsClient` looks the id up in
 * the S1 API and throws `Agent id [...] not found`). Resolving a hostname to a
 * Fleet collector and then handing that id to the vendor client therefore fails
 * closed at best and targets the wrong machine at worst. Until there is a real
 * Fleet agent id -> EDR agent id mapping, non-Defend agents resolve as
 * `endpoint_not_found` instead of being dispatched to.
 */
export const DISPATCH_AGENT_TYPES = ['endpoint'] as const;

export type DispatchPrivilege = Extract<
  keyof EndpointAuthz,
  'canIsolateHost' | 'canUnIsolateHost' | 'canWriteScanOperations' | 'canGetRunningProcesses'
>;

export interface DispatchRequest {
  action: DispatchActionName;
  params: { hostName?: string; agentId?: string };
  context: ToolHandlerContext;
  endpointAppContextService: EndpointAppContextService;
  /** Endpoint privilege the equivalent HTTP route requires for this action. */
  requiredPrivilege: DispatchPrivilege;
}

export type DispatchTarget = Extract<ResolvedDispatchTarget, { kind: 'found' }>;

export type DispatchPreparation =
  | { kind: 'ready'; target: DispatchTarget }
  | { kind: 'result'; result: ToolHandlerStandardReturn };

/**
 * What the analyst-facing confirmation card should say about the host the tool
 * will act on. Built from the *resolved* Fleet record, never from the model's
 * raw tool parameters: the card is the only human gate on a write action, so a
 * prompt-injected `{ hostName: 'web-01', agentId: <db-01's id> }` must not be
 * able to render one host and isolate another.
 */
export interface HostNameMismatch {
  providedHostName: string;
  fleetHostName: string;
}

export type ConfirmationTarget =
  | {
      kind: 'resolved';
      /** Fleet hostname when known, else the agent id. */
      hostLabel: string;
      endpoint: ResolvedEndpoint;
      /**
       * Set when both a hostname and an agent id were supplied and the agent's
       * Fleet hostname is neither. The handler refuses the call, so the card
       * says so instead of naming a host that will not be acted on.
       */
      mismatch?: HostNameMismatch;
    }
  | { kind: 'blocked'; message: string };

/**
 * A lookup that can only resolve Elastic Defend agents. Both the hostname walk
 * and the agent-id lookup honour it, so neither path can hand a non-Defend
 * agent to a vendor response-actions client.
 */
export const createDispatchLookup = (
  endpointAppContextService: EndpointAppContextService,
  spaceId: string
) =>
  createEndpointLookupService(endpointAppContextService, spaceId, undefined, {
    agentTypes: [...DISPATCH_AGENT_TYPES],
  });

const resolveTarget = (request: DispatchRequest): Promise<ResolvedDispatchTarget> =>
  resolveDispatchTarget(
    createDispatchLookup(request.endpointAppContextService, request.context.spaceId),
    request.action,
    request.params
  );

/**
 * A hostname that disagrees with the Fleet hostname of the supplied agent id.
 * `resolveDispatchTarget` prefers the id, so without this check the two inputs
 * can name different hosts and the model's hostname is what the card shows.
 */
export const findHostNameMismatch = (
  providedHostName: string | undefined,
  endpoint: ResolvedEndpoint
): HostNameMismatch | undefined =>
  providedHostName && endpoint.hostName && endpoint.hostName !== providedHostName
    ? { providedHostName, fleetHostName: endpoint.hostName }
    : undefined;

const mismatchResult = (mismatch: HostNameMismatch) =>
  responseActionErrorResult(
    'invalid_argument',
    `The supplied hostName '${mismatch.providedHostName}' is not the Fleet hostname '${mismatch.fleetHostName}' of the supplied agentId, so the target is ambiguous. Call the tool again with the agentId alone (or with the matching hostname).`
  );

/**
 * Resolves the target for the confirmation card. Never throws and never
 * dispatches: an unresolvable host or a missing privilege is reported in the
 * card text so the analyst is not asked to approve an action that the handler
 * will refuse.
 */
export const describeDispatchTargetForConfirmation = async (
  request: DispatchRequest
): Promise<ConfirmationTarget> => {
  const { context, endpointAppContextService, requiredPrivilege } = request;

  const authz = await endpointAppContextService.getEndpointAuthz(context.request);
  if (!authz[requiredPrivilege]) {
    return {
      kind: 'blocked',
      message: `You do not have the '${requiredPrivilege}' endpoint privilege, so this action will be refused. Ask an administrator to grant it, or perform the action from the Security UI.`,
    };
  }

  const target = await resolveTarget(request);

  if (target.kind === 'respond') {
    return { kind: 'blocked', message: target.data.message };
  }

  const mismatch = findHostNameMismatch(request.params.hostName, target.endpoint);

  return {
    kind: 'resolved',
    hostLabel: target.hostLabel,
    endpoint: target.endpoint,
    ...(mismatch ? { mismatch } : {}),
  };
};

/**
 * Shared preparation for every dispatching tool handler, so the
 * security-relevant steps (call-source gate, authz, Defend-scoped resolution,
 * card/dispatch divergence check) exist once instead of four times.
 *
 * Order matters: the call source is checked before anything is read, and the
 * privilege check runs before the handler touches Fleet.
 */
export const prepareDispatch = async (request: DispatchRequest): Promise<DispatchPreparation> => {
  const { context, endpointAppContextService, requiredPrivilege, params } = request;

  // The runner only prompts for confirmation when the call comes from the agent
  // (`source === 'agent'` in run_tool.ts); a `user`/`mcp` call reaches the
  // handler unprompted. Refuse anything that did not come through the agent so
  // the HITL card cannot be bypassed — same guard as the policy-management
  // skill's writes.
  if (context.callContext?.callSource !== 'agent') {
    return { kind: 'result', result: nonAgentCallSourceResult(context) };
  }

  const authz = await endpointAppContextService.getEndpointAuthz(context.request);
  if (!authz[requiredPrivilege]) {
    return { kind: 'result', result: insufficientPrivilegesResult(requiredPrivilege) };
  }

  const target = await resolveTarget(request);

  if (target.kind === 'respond') {
    return {
      kind: 'result',
      result: {
        results: [
          { tool_result_id: getToolResultId(), type: ToolResultType.other, data: target.data },
        ],
      },
    };
  }

  const mismatch = findHostNameMismatch(params.hostName, target.endpoint);
  if (mismatch) {
    return { kind: 'result', result: mismatchResult(mismatch) };
  }

  return { kind: 'ready', target };
};

/**
 * Renders the analyst-supplied `comment` on the confirmation card. The comment
 * is model-authored, is recorded in the Response Actions audit log under the
 * *analyst's* username, and used to be invisible at the moment of confirming —
 * so the card shows the exact text it will be attributed to them.
 */
export const analystCommentNote = (comment: string | undefined): string =>
  comment
    ? `\n\nThe response action log will record this comment under your username: "${comment}"`
    : '';

interface ConfirmationCardOptions {
  title: string;
  color: 'danger' | 'warning' | 'primary';
  confirmText: string;
  /** Sentence naming the action; `host` is the already-formatted resolved host. */
  describe: (host: string) => string;
  /** The model-written comment, shown verbatim because it is logged under the analyst. */
  comment?: string;
}

/**
 * Builds the confirmation card from the host the handler will really act on
 * (Fleet hostname + agent id), the analyst's endpoint privilege, and the exact
 * comment that will be logged under their name. When the call cannot succeed
 * (no privilege, unknown host, ambiguous hostname, hostname/agent-id
 * mismatch) the card says so rather than presenting an approvable action.
 */
export const buildDispatchConfirmation = async (
  request: DispatchRequest,
  options: ConfirmationCardOptions
) => {
  const target = await describeDispatchTargetForConfirmation(request);
  const base = {
    title: options.title,
    color: options.color,
    confirm_text: options.confirmText,
  };

  if (target.kind === 'blocked') {
    return {
      ...base,
      color: 'warning' as const,
      message: `**This action will be refused.** ${target.message}`,
    };
  }

  if (target.mismatch) {
    return {
      ...base,
      color: 'warning' as const,
      message: `**This action will be refused.** The requested hostname '${target.mismatch.providedHostName}' does not match the Fleet hostname '${target.mismatch.fleetHostName}' of agent ID ${target.endpoint.agentId}.`,
    };
  }

  const host = `${target.hostLabel} (agent ID ${target.endpoint.agentId})`;

  return {
    ...base,
    message: `${options.describe(`**${host}**`)}${analystCommentNote(options.comment)}`,
  };
};

export const nonAgentCallSourceMessage = (context: ToolHandlerContext): string =>
  `This tool dispatches endpoint response actions only from an agent conversation, where each action is confirmed by the analyst first (this call came from '${context.callContext?.callSource}'). Ask through the assistant instead.`;

const nonAgentCallSourceResult = (context: ToolHandlerContext) =>
  responseActionErrorResult('invalid_argument', nonAgentCallSourceMessage(context));
