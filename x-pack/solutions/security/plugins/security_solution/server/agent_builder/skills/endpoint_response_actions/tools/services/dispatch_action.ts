/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ToolHandlerContext,
  ToolHandlerStandardReturn,
} from '@kbn/agent-builder-server/tools';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAuthz } from '../../../../../../common/endpoint/types/authz';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import {
  licenseLimitOf,
  licenseTierRequiredResult,
  licenseUnavailableResult,
  productFeatureDisabledResult,
  responseActionErrorResult,
  responseActionsProductFeatureEnabled,
  insufficientPrivilegesResult,
} from '../types';
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

/**
 * The license tier `calculateEndpointAuthz` conjunctions each dispatch
 * privilege with (`authz.ts`: `canIsolateHost: ... && isPlatinumPlusLicense`,
 * `canWriteScanOperations` / `canGetRunningProcesses`: `... &&
 * isEnterpriseLicense`). `canUnIsolateHost` is deliberately ungated there — a
 * license lapse must never leave a host isolated with no way to release it —
 * so it maps to no tier.
 *
 * When `authz[privilege]` is false on a deployment already at the required
 * tier, the role is what is missing; below it, the license is. Only the second
 * case is reported as `license_tier_required`.
 */
export const DISPATCH_PRIVILEGE_LICENSE_TIERS: Record<
  DispatchPrivilege,
  'platinum' | 'enterprise' | undefined
> = {
  canIsolateHost: 'platinum',
  canUnIsolateHost: undefined,
  canWriteScanOperations: 'enterprise',
  canGetRunningProcesses: 'enterprise',
};

export interface DispatchRequest {
  action: DispatchActionName;
  params: { hostName?: string; agentId?: string };
  /**
   * Model-facing arguments beyond the target that the confirmation card
   * displays and the dispatch uses (scan `path`; every tool's `comment`).
   * Recorded verbatim while the card is built and re-checked by the handler:
   * a resumed call replaying a confirmed tool-call ID with different
   * arguments (e.g. path `/B` after `/A` was approved) must not inherit the
   * approval, so the analyst is shown a fresh card instead.
   */
  args?: DispatchConfirmationArgs;
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
 * The model-authored arguments a confirmation card displays, keyed by name.
 * Values are compared verbatim between the card build and the handler; an
 * `undefined` value is the same as an absent key (a tool with no `comment`).
 */
export type DispatchConfirmationArgs = Record<string, string | undefined>;

/** Order-independent comparison key for recorded vs. supplied arguments. */
const stableArgsKey = (args: DispatchConfirmationArgs | undefined): string =>
  JSON.stringify(
    Object.entries(args ?? {})
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
  );

/**
 * The argument names whose defined values differ between the confirmed card
 * and this call — what the model needs to correct, without echoing argument
 * values into the error.
 */
const differingArgNames = (
  confirmed: DispatchConfirmationArgs | undefined,
  supplied: DispatchConfirmationArgs | undefined
): string[] => {
  const names = new Set([...Object.keys(confirmed ?? {}), ...Object.keys(supplied ?? {})]);
  return [...names].filter(
    (name) => (confirmed?.[name] ?? undefined) !== (supplied?.[name] ?? undefined)
  );
};

/**
 * Snapshot of the confirmation card, taken when it is built and read back by
 * the handler after the analyst clicks. It binds the approval to what the
 * card showed — the resolved agent id and the displayed arguments — so a
 * later call replaying the confirmed tool call with a different target or
 * different arguments does not inherit it. A refused card (failed preflight,
 * missing privilege, hostname/agent-id mismatch) is recorded as a refusal:
 * approving it must never dispatch. The record is stored on the tool call
 * (`stateManager` is scoped to it), so it survives the prompt round.
 */
export type DispatchConfirmationState =
  | {
      /** The card named the verified target: dispatch only to this agent id. */
      kind: 'confirmed';
      action: DispatchActionName;
      agentId: string;
      /** The arguments the card displayed (`path`, `comment`); the dispatch is held to them. */
      args?: DispatchConfirmationArgs;
    }
  | {
      /** The card said the action would be refused: never dispatch. */
      kind: 'refused';
      action: DispatchActionName;
      /** The refusal the analyst was shown, echoed to the caller. */
      reason: string;
    };

/**
 * A lookup that can only resolve Elastic Defend agents, and only on origin
 * sources — but which still LOOKS at the request-scoped candidate set under
 * CPS so a same-named endpoint in a linked project surfaces as ambiguity
 * instead of the origin host being offered on a confirmation card. Both the
 * hostname walk and the agent-id lookup honour the agent-type scope, so
 * neither path can hand a non-Defend agent to a vendor response-actions
 * client.
 *
 * `scoped` is request-bound and the confirmation card can be built without a
 * request identity (e.g. a synthetic context in tests), so it is resolved
 * defensively: a missing request degrades to the origin-only behaviour
 * rather than failing the card.
 */
export const createDispatchLookup = async (
  endpointAppContextService: EndpointAppContextService,
  spaceId: string,
  request?: KibanaRequest
) => {
  const scoped = request ? await endpointAppContextService.asScoped(request) : undefined;

  return createEndpointLookupService(endpointAppContextService, spaceId, scoped, {
    agentTypes: [...DISPATCH_AGENT_TYPES],
    resolutionMode: 'dispatch',
  });
};

const resolveTarget = async (request: DispatchRequest): Promise<ResolvedDispatchTarget> =>
  resolveDispatchTarget(
    await createDispatchLookup(
      request.endpointAppContextService,
      request.context.spaceId,
      request.context.request
    ),
    request.action,
    request.params
  );

/**
 * Distinguishes a missing role privilege from a license limit — and from a
 * product-configuration refusal — when `authz[privilege]` is false, without
 * re-deriving `calculateEndpointAuthz`'s conjunctions here: the privilege flag
 * already folds all three in, so the license and product-features services are
 * only consulted when the flag is false to decide which of the refusal shapes
 * to return. `undefined` in `DISPATCH_PRIVILEGE_LICENSE_TIERS` means the
 * privilege has no license conjunction, so the license is never the
 * explanation.
 *
 * A license refusal itself has two causes (see `licenseLimitOf`): the active
 * license is honestly below the required tier, or the license has expired /
 * could not be read — in which case no tier comparison is meaningful and the
 * answer is renewal or restoration, not an upgrade.
 *
 * On serverless, response-action privileges also derive from product features
 * (see `PRIVILEGE_PRODUCT_FEATURES`), and the license is always Enterprise —
 * so when the license raises no objection
 * but none of the privilege's features is enabled, the deployment's product
 * tier is the honest explanation, not a role grant or a license upgrade.
 */
const privilegeRefusal = (
  endpointAppContextService: EndpointAppContextService,
  privilege: DispatchPrivilege | 'canReadSecuritySolution'
):
  | { kind: 'privilege'; privilege: string }
  | { kind: 'license'; privilege: DispatchPrivilege; tier: 'platinum' | 'enterprise' }
  | { kind: 'license_state'; privilege: DispatchPrivilege; expired: boolean }
  | { kind: 'product_feature'; privilege: DispatchPrivilege } => {
  if (privilege !== 'canReadSecuritySolution') {
    const requiredTier = DISPATCH_PRIVILEGE_LICENSE_TIERS[privilege];
    if (requiredTier) {
      const limit = licenseLimitOf(endpointAppContextService.getLicenseService(), requiredTier);
      if (limit?.kind === 'tier') {
        return { kind: 'license', privilege, tier: limit.tier };
      }
      if (limit?.kind === 'state') {
        return { kind: 'license_state', privilege, expired: limit.expired };
      }
    }
    if (
      responseActionsProductFeatureEnabled(
        endpointAppContextService.getProductFeaturesService(),
        privilege
      ) === false
    ) {
      return { kind: 'product_feature', privilege };
    }
  }

  return { kind: 'privilege', privilege };
};

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
 * The model-facing arguments worth binding an approval to: only the ones with
 * a defined value (a tool with no `comment` records no `args` at all), so the
 * recorded state stays minimal and comparisons ignore absent keys.
 */
const confirmationArgsOf = (
  args: DispatchConfirmationArgs | undefined
): DispatchConfirmationArgs | undefined => {
  const defined = Object.fromEntries(
    Object.entries(args ?? {}).filter(([, value]) => value !== undefined)
  );
  return Object.keys(defined).length ? defined : undefined;
};

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
    ...(request.args ? { args: confirmationArgsOf(request.args) } : {}),
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

/**
 * The arguments of this call are not the ones the analyst confirmed. The card
 * is the human gate on the whole request — the scan path and the comment it
 * displays are part of what was approved — so a call that resumes a confirmed
 * tool call with different arguments (a replaced `path`, an edited `comment`)
 * must not inherit the approval. Only argument NAMES are echoed, never their
 * values: a rejected value was never approved, and the model already has it.
 */
const changedArgsResult = (differing: string[]) =>
  responseActionErrorResult(
    'invalid_argument',
    `The arguments of this call differ from the ones the analyst confirmed (differing: ${differing.join(
      ', '
    )}), so nothing was dispatched. Call the tool again, so the analyst is shown the actual arguments on a new confirmation card.`
  );

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
      const refusal = privilegeRefusal(endpointAppContextService, requiredPrivilege);
      if (refusal.kind === 'license') {
        const tierName = refusal.tier === 'platinum' ? 'Platinum' : 'Enterprise';
        return {
          kind: 'blocked',
          message: `This deployment's license tier does not include '${requiredPrivilege}' (requires ${tierName} or higher), so this action will be refused regardless of role. Ask an administrator about upgrading the Elastic license; nothing you can grant will enable it here.`,
        };
      }
      if (refusal.kind === 'license_state') {
        return {
          kind: 'blocked',
          message: `This deployment's Elastic license is ${
            refusal.expired ? 'expired' : 'not available'
          }, so '${requiredPrivilege}' is disabled regardless of role. Ask an administrator about ${
            refusal.expired ? 'renewing the license' : 'restoring license availability'
          }; while that is the case a role grant will not enable it here.`,
        };
      }
      if (refusal.kind === 'product_feature') {
        return {
          kind: 'blocked',
          message: `Response actions are not part of this deployment's product configuration, so '${requiredPrivilege}' is disabled regardless of role. Ask an administrator about the product tier of this project (on serverless, response actions require the Endpoint Complete tier); a role grant will not enable it here.`,
        };
      }
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
    const refusal = privilegeRefusal(endpointAppContextService, requiredPrivilege);
    if (refusal.kind === 'license') {
      return { kind: 'result', result: licenseTierRequiredResult(refusal.privilege, refusal.tier) };
    }
    if (refusal.kind === 'license_state') {
      return {
        kind: 'result',
        result: licenseUnavailableResult(refusal.privilege, refusal.expired),
      };
    }
    if (refusal.kind === 'product_feature') {
      return { kind: 'result', result: productFeatureDisabledResult(refusal.privilege) };
    }
    return { kind: 'result', result: insufficientPrivilegesResult(refusal.privilege) };
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

  if (stableArgsKey(approved.args) !== stableArgsKey(request.args)) {
    return {
      kind: 'result',
      result: changedArgsResult(differingArgNames(approved.args, request.args)),
    };
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
