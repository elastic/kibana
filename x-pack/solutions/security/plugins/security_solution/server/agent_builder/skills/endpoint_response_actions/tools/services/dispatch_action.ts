/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { escapeQuotes } from '@kbn/es-query';
import { FLEET_ENDPOINT_PACKAGE, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
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
  params: { hostName?: string; ip?: string; agentId?: string };
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
  /**
   * Every hostname the supplied agent is known by — Fleet's name for it and
   * the Defend metadata names. The caller supplied none of them.
   */
  knownHostNames: string[];
}

export type ConfirmationTarget =
  | {
      kind: 'resolved';
      /** Fleet hostname when known, else the agent id. */
      hostLabel: string;
      endpoint: ResolvedEndpoint;
      /**
       * Set when both a hostname and an agent id were supplied and the hostname
       * is none of the names that agent is known by (Fleet's or Defend's). The
       * handler refuses the call, so the card says so instead of naming a host
       * that will not be acted on.
       */
      mismatch?: HostNameMismatch;
    }
  | { kind: 'blocked'; message: string };

/**
 * What the analyst was shown and approved, recorded while the confirmation card
 * is built and read back by the handler after the click.
 *
 * The handler re-resolves the target once the call is confirmed, so without this
 * record the card and the dispatch are independent evaluations of the same
 * request: a transient Fleet/authz failure renders a "this action will be
 * refused" card, and the handler dispatches to whatever it resolves after the
 * service recovers — a target the card never showed. The record is stored on the
 * tool call (`stateManager` is scoped to it), so it survives the prompt round.
 */
export type DispatchConfirmationState =
  | {
      /** The card named the verified target: dispatch only to this agent id. */
      kind: 'confirmed';
      action: DispatchActionName;
      agentId: string;
    }
  | {
      /** The card said the action would be refused: never dispatch. */
      kind: 'refused';
      action: DispatchActionName;
      /** The refusal the analyst was shown, echoed to the caller. */
      reason: string;
    };

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
 * A hostname that disagrees with every hostname the supplied agent id is known
 * by. `resolveDispatchTarget` prefers the id, so without this check the two
 * inputs can name different hosts and the model's hostname is what the card
 * shows.
 *
 * Fleet and Defend name the same machine differently under an agent policy
 * whose hostname format is FQDN (Fleet's `local_metadata.host.name` is the
 * FQDN; Defend's metadata and `list_endpoints` show the short OS hostname), so
 * either identity of *that same agent* counts as a match. An alias belonging
 * to a different agent still does not — the Defend names come from a read
 * keyed on the supplied id.
 */
export const findHostNameMismatch = (
  providedHostName: string | undefined,
  endpoint: ResolvedEndpoint
): HostNameMismatch | undefined => {
  if (!providedHostName) {
    return undefined;
  }

  const knownHostNames = [endpoint.hostName, ...(endpoint.defendHostNames ?? [])].filter(
    (name): name is string => Boolean(name)
  );

  // No name to compare against: refuse only on evidence the lookup actually
  // has, as before.
  if (!knownHostNames.length || knownHostNames.includes(providedHostName)) {
    return undefined;
  }

  return { providedHostName, knownHostNames };
};

/** Renders hostnames for the analyst-facing refusal text. */
const quotedNames = (names: string[]) => names.map((name) => `'${name}'`).join(', ');

const mismatchResult = (mismatch: HostNameMismatch) =>
  responseActionErrorResult(
    'invalid_argument',
    `The supplied hostName '${
      mismatch.providedHostName
    }' is not a hostname of the supplied agentId (known: ${quotedNames(
      mismatch.knownHostNames
    )}), so the target is ambiguous. Call the tool again with the agentId alone (or with one of those hostnames).`
  );

/** Sentence both the refusal card and the recorded confirmation use. */
const hostNameMismatchRefusal = (mismatch: HostNameMismatch, agentId: string): string =>
  `The requested hostname '${
    mismatch.providedHostName
  }' is not a hostname of agent ID ${agentId} (known: ${quotedNames(mismatch.knownHostNames)}).`;

/**
 * Records what the card tells the analyst, so the handler can hold the dispatch
 * to it. A refused card (failed preflight, missing privilege, hostname/agent-id
 * mismatch) is recorded as a refusal: approving it must never dispatch.
 */
const recordConfirmation = (request: DispatchRequest, target: ConfirmationTarget): void => {
  const { action, context } = request;

  if (target.kind === 'blocked') {
    context.stateManager.setState<DispatchConfirmationState>({
      kind: 'refused',
      action,
      reason: target.message,
    });
    return;
  }

  if (target.mismatch) {
    context.stateManager.setState<DispatchConfirmationState>({
      kind: 'refused',
      action,
      reason: hostNameMismatchRefusal(target.mismatch, target.endpoint.agentId),
    });
    return;
  }

  context.stateManager.setState<DispatchConfirmationState>({
    kind: 'confirmed',
    action,
    agentId: target.endpoint.agentId,
  });
};

/**
 * A dispatch reaching the handler without a verification of the target the card
 * named — the analyst approved a refusal, or the tool call was resumed with no
 * confirmation record at all. Nothing is dispatched; re-running the tool is what
 * produces a fresh card naming the host that will be acted on.
 */
const unconfirmedDispatchResult = (state: DispatchConfirmationState | undefined) =>
  responseActionErrorResult(
    'invalid_argument',
    state?.kind === 'refused'
      ? `The confirmation shown for this call reported that the action would be refused (${state.reason}), so nothing was dispatched. Resolve that and call the tool again, so the analyst is shown a new confirmation card naming the verified host.`
      : `The target of this call is not covered by a confirmation, so nothing was dispatched. Call the tool again, so the analyst is asked to confirm the resolved host.`
  );

/** The host resolved for the call is not the one the analyst confirmed. */
const changedTargetResult = (confirmedAgentId: string, resolvedAgentId: string) =>
  responseActionErrorResult(
    'invalid_argument',
    `The host resolved for this call changed after the analyst confirmed it (confirmed agent ID ${confirmedAgentId}, which now resolves to ${resolvedAgentId}), so nothing was dispatched. Call the tool again, so the analyst is shown the current target on a new confirmation card.`
  );

const isolationNoOpResult = (
  action: Extract<DispatchActionName, 'isolate' | 'unisolate'>,
  target: DispatchTarget
): ToolHandlerStandardReturn => ({
  results: [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.other,
      data: {
        kind: 'response_action_result' as const,
        action,
        status: 'completed',
        wasSuccessful: true,
        noOp: true,
        agentId: target.endpoint.agentId,
        hostName: target.hostLabel,
        isolated: action === 'isolate',
        message:
          action === 'isolate'
            ? `${target.hostLabel} is already isolated; no response action was dispatched.`
            : `${target.hostLabel} is already released from isolation; no response action was dispatched.`,
      },
    },
  ],
});

/** Host isolation refusal shared by the confirmation and dispatch gates. */
const hostIsolationDisabledMessage = (hostLabel: string): string =>
  `Host isolation is disabled by the endpoint policy assigned to ${hostLabel}, so the endpoint will refuse this action. Enable linux.advanced.host_isolation.allowed in that policy before trying again.`;

const isHostIsolationDisabled = async (
  request: DispatchRequest,
  target: DispatchTarget
): Promise<boolean> => {
  // This setting exists only in the Linux policy schema. Unknown, Windows,
  // and macOS platforms must not be refused based on a sibling Linux block.
  if (
    request.action !== 'isolate' ||
    target.endpoint.platform !== 'linux' ||
    !target.endpoint.policyId
  ) {
    return false;
  }

  const fleet = request.endpointAppContextService.getInternalFleetServices(request.context.spaceId);
  const kuery = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: ${FLEET_ENDPOINT_PACKAGE} AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.policy_ids: "${escapeQuotes(
    target.endpoint.policyId
  )}"`;
  const { items } = await fleet.packagePolicy.list(fleet.getSoClient(), {
    kuery,
    perPage: 1,
    spaceId: request.context.spaceId,
  });
  const policyValue = items[0]?.inputs?.[0]?.config?.policy?.value as
    | { linux?: { advanced?: { host_isolation?: { allowed?: boolean } } } }
    | undefined;

  return policyValue?.linux?.advanced?.host_isolation?.allowed === false;
};

const getIsolationState = async (
  request: DispatchRequest,
  agentId: string
): Promise<boolean | undefined> => {
  const quotedAgentId = `"${escapeQuotes(agentId)}"`;
  const { data } = await request.endpointAppContextService
    .getEndpointMetadataService(request.context.spaceId)
    .getHostMetadataList({
      page: 0,
      pageSize: 1,
      kuery: `(united.agent.agent.id: ${quotedAgentId} OR agent.id: ${quotedAgentId})`,
    });

  return data?.[0]?.metadata?.Endpoint?.state?.isolation;
};

/**
 * Resolves the target for the confirmation card. Never throws and never
 * dispatches: an unresolvable host, a missing privilege, or a Fleet/metadata
 * read that fails while building the card is reported in the card text so the
 * analyst is not asked to approve an action that the handler will refuse.
 *
 * The catch is load-bearing: this phase runs before the tool handler
 * (`run_tool.ts` awaits `confirmation.getConfirmation` outside its own error
 * handling), so letting a service read reject here would fail tool execution
 * with neither a card nor the handler's structured error result.
 */
export const describeDispatchTargetForConfirmation = async (
  request: DispatchRequest
): Promise<ConfirmationTarget> => {
  const { context, endpointAppContextService, requiredPrivilege } = request;

  try {
    const authz = await endpointAppContextService.getEndpointAuthz(context.request);
    // The HTTP routes require the `securitySolution` feature privilege on top
    // of the endpoint sub-feature privilege; a sub-feature alone does not
    // grant it, so assert both layers (see `get_response_action_status`).
    if (!authz.canReadSecuritySolution) {
      return {
        kind: 'blocked',
        message: `You do not have the 'canReadSecuritySolution' privilege (Security feature access), so this action will be refused. Ask an administrator to grant it, or perform the action from the Security UI.`,
      };
    }
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

    if (!mismatch && (await isHostIsolationDisabled(request, target))) {
      return { kind: 'blocked', message: hostIsolationDisabledMessage(target.hostLabel) };
    }

    return {
      kind: 'resolved',
      hostLabel: target.hostLabel,
      endpoint: target.endpoint,
      ...(mismatch ? { mismatch } : {}),
    };
  } catch (error) {
    return {
      kind: 'blocked',
      message: `The target host could not be verified (${
        error instanceof Error ? error.message : String(error)
      }), so this action cannot be dispatched yet. Retry once Fleet and the Endpoint services are reachable, or perform the action from the Security UI.`,
    };
  }
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
  // Same two layers as the HTTP routes: `securitySolution` first, then the
  // action's endpoint privilege.
  if (!authz.canReadSecuritySolution) {
    return { kind: 'result', result: insufficientPrivilegesResult('canReadSecuritySolution') };
  }
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

  // The card is the human gate, and the handler re-resolves after the click, so
  // the dispatch is held to what the card showed: the agent id recorded when the
  // card was built. A card that reported a refusal records no verified target
  // and can therefore never dispatch here, however the lookup behaves now.
  const approved = context.stateManager.getState<DispatchConfirmationState>();

  if (approved?.kind !== 'confirmed' || approved.action !== request.action) {
    return { kind: 'result', result: unconfirmedDispatchResult(approved) };
  }

  if (approved.agentId !== target.endpoint.agentId) {
    return {
      kind: 'result',
      result: changedTargetResult(approved.agentId, target.endpoint.agentId),
    };
  }

  if (await isHostIsolationDisabled(request, target)) {
    return {
      kind: 'result',
      result: responseActionErrorResult(
        'invalid_argument',
        hostIsolationDisabledMessage(target.hostLabel)
      ),
    };
  }

  if (request.action === 'isolate' || request.action === 'unisolate') {
    const isolated = await getIsolationState(request, target.endpoint.agentId);
    if (
      (request.action === 'isolate' && isolated === true) ||
      (request.action === 'unisolate' && isolated === false)
    ) {
      return { kind: 'result', result: isolationNoOpResult(request.action, target) };
    }
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
  // Record what the card is about to tell the analyst before it is returned: the
  // state is snapshotted with the prompt and read back by the handler after the
  // click, which is what keeps a refused card from authorizing a later dispatch.
  recordConfirmation(request, target);

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
      message: `**This action will be refused.** ${hostNameMismatchRefusal(
        target.mismatch,
        target.endpoint.agentId
      )}`,
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
