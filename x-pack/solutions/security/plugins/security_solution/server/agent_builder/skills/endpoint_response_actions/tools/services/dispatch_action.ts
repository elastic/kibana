/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ToolHandlerContext, ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import { getToolResultId } from '@kbn/agent-builder-server/tools';

import type { EndpointAuthz } from '../../../../../../common/endpoint/types/authz';
import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import {
  formatForConfirmationCard,
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

/** Actions that only read from the host and so dispatch without a confirmation. */
const UNCONFIRMED_ACTIONS: readonly DispatchActionName[] = ['running-processes'];

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
  /**
   * The card the analyst confirms the resolved host with, after every refusal
   * check has passed. Required for every action except `running-processes`,
   * which only reads: a write action without one is refused, not dispatched.
   */
  confirmation?: DispatchConfirmationCard;
}

export type DispatchTarget = Extract<ResolvedDispatchTarget, { kind: 'found' }>;

export type DispatchPreparation =
  | { kind: 'ready'; target: DispatchTarget }
  | { kind: 'result'; result: ToolHandlerReturn };

/**
 * The analyst-facing confirmation card of a write action. Absent for an
 * inspection action that dispatches without a prompt.
 */
export interface DispatchConfirmationCard {
  title: string;
  color: 'danger' | 'warning' | 'primary';
  confirmText: string;
  /** Sentence naming the action; `host` is the already-formatted resolved host. */
  describe: (host: string) => string;
  /** The model-written comment, shown verbatim because it is logged under the analyst. */
  comment?: string;
}

/** A hostname that disagrees with every hostname the supplied agent id is known by. */
export interface HostNameMismatch {
  providedHostName: string;
  /**
   * Every hostname the supplied agent is known by — Fleet's name for it and
   * the Defend metadata names. The caller supplied none of them.
   */
  knownHostNames: string[];
}

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
 * different arguments does not inherit it. The record is stored on the tool
 * call (`stateManager` is scoped to it), so it survives the prompt round.
 */
export interface DispatchConfirmationState {
  /** The card named the verified target: dispatch only to this agent id. */
  kind: 'confirmed';
  action: DispatchActionName;
  agentId: string;
  /** The arguments the card displayed (`path`, `comment`); the dispatch is held to them. */
  args?: DispatchConfirmationArgs;
}

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
 * to it once the analyst clicks.
 */
const recordConfirmation = (request: DispatchRequest, target: DispatchTarget): void => {
  request.context.stateManager.setState<DispatchConfirmationState>({
    kind: 'confirmed',
    action: request.action,
    agentId: target.endpoint.agentId,
    ...(request.args ? { args: confirmationArgsOf(request.args) } : {}),
  });
};

/**
 * A dispatch reaching the handler after an approval with no record of the
 * target the card named. Nothing is dispatched; re-running the tool produces a
 * fresh card naming the host that will be acted on.
 */
const unconfirmedDispatchResult = () =>
  responseActionErrorResult(
    'invalid_argument',
    `The target of this call is not covered by a confirmation, so nothing was dispatched. Call the tool again, so the analyst is asked to confirm the resolved host.`
  );

const missingConfirmationResult = (action: DispatchActionName) =>
  responseActionErrorResult(
    'invalid_argument',
    `The '${action}' tool has no analyst confirmation configured, so nothing was dispatched.`
  );

const cancelledResult = (action: DispatchActionName) =>
  responseActionErrorResult(
    'invalid_argument',
    `The analyst declined the '${action}' confirmation, so nothing was dispatched.`
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
 * Shared preparation for every dispatching tool handler, so the
 * security-relevant steps (call-source gate, authz, Defend-scoped resolution,
 * card/dispatch divergence check) exist once instead of four times.
 *
 * Order matters: the call source is checked before anything is read, and the
 * privilege check runs before the handler touches Fleet.
 */
export const prepareDispatch = async (request: DispatchRequest): Promise<DispatchPreparation> => {
  const { context, endpointAppContextService, requiredPrivilege, params } = request;

  // Refuse anything that did not come through the agent so the analyst's
  // confirmation cannot be bypassed — same guard as the policy-management
  // skill's writes.
  if (context.callContext?.callSource !== 'agent') {
    return { kind: 'result', result: nonAgentCallSourceResult(context) };
  }

  // Only the read-only action may skip the prompt; a write action whose tool
  // forgot its card must not dispatch unconfirmed.
  const { confirmation } = request;
  if (!confirmation && !UNCONFIRMED_ACTIONS.includes(request.action)) {
    return { kind: 'result', result: missingConfirmationResult(request.action) };
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

  if (!confirmation) {
    return { kind: 'ready', target };
  }

  // The confirmation is asked here, after every refusal check above, so an
  // analyst is never shown an approve button for a call that cannot succeed.
  // The dispatch is held to what the card showed: the agent id and arguments
  // recorded when it was built.
  const promptId = `${request.action}.confirm.${context.callContext.toolCallId}`;
  const { status } = context.prompts.checkConfirmationStatus(promptId);

  if (status === ConfirmationStatus.unprompted) {
    recordConfirmation(request, target);
    return {
      kind: 'result',
      result: context.prompts.askForConfirmation({
        id: promptId,
        title: confirmation.title,
        message: `${confirmation.describe(
          `**${target.hostLabel} (agent ID ${target.endpoint.agentId})**`
        )}${analystCommentNote(confirmation.comment)}`,
        confirm_text: confirmation.confirmText,
        cancel_text: i18n.translate(
          'xpack.securitySolution.endpointResponseActionsSkill.confirmation.cancel',
          { defaultMessage: 'Cancel' }
        ),
        color: confirmation.color,
      }),
    };
  }

  if (status === ConfirmationStatus.rejected) {
    return { kind: 'result', result: cancelledResult(request.action) };
  }

  const approved = context.stateManager.getState<DispatchConfirmationState>();

  if (approved?.kind !== 'confirmed' || approved.action !== request.action) {
    return { kind: 'result', result: unconfirmedDispatchResult() };
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
 * so the card shows the exact text it will be attributed to them. Shown as a
 * code span with invisible characters escaped: a raw newline would let a
 * crafted comment forge extra lines on the card (see
 * `formatForConfirmationCard`).
 */
export const analystCommentNote = (comment: string | undefined): string =>
  comment
    ? `\n\nThe response action log will record this comment under your username: \`${formatForConfirmationCard(
        comment
      )}\``
    : '';

export const nonAgentCallSourceMessage = (context: ToolHandlerContext): string =>
  `This tool dispatches endpoint response actions only from an agent conversation, where each action is confirmed by the analyst first (this call came from '${context.callContext?.callSource}'). Ask through the assistant instead.`;

const nonAgentCallSourceResult = (context: ToolHandlerContext) =>
  responseActionErrorResult('invalid_argument', nonAgentCallSourceMessage(context));
