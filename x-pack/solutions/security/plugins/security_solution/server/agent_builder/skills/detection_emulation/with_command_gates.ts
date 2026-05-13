/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { RunEmulationCommandInput } from '../../../../common/detection_emulation/schemas';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  EmulationRunner,
  UnsupportedAgentTypeError,
  UnsupportedCommandForAgentTypeError,
  MissingConnectorActionsError,
} from '../../../lib/detection_emulation/execution/runner';
import type { EmulationAllowlist } from '../../../lib/detection_emulation/execution/allowlist';
import type { EmulationRateLimiter } from '../../../lib/detection_emulation/execution/rate_limiter';
import type { ActorContext } from '../../../lib/detection_emulation/execution/audit_context';
import {
  getDetectionEmulationFeatureFlags,
  getRealExecutionDisableReason,
  isRealExecutionEnabled,
  REAL_EXECUTION_DISABLE_REASON_TEXT,
} from '../../../lib/detection_emulation/feature_flag';
import { createSavedObjectRuleBindingLookup } from '../../../lib/detection_emulation/rule_binding_lookup';
import { emulationRuleBindingTypeName } from '../../../lib/detection_emulation/rule_binding';

/**
 * Shared per-call dependencies the four per-family runEmulationCommand
 * tools all need to enforce the same security gates and dispatch through
 * the runner. Constructed once at tool creation time (allowlist + rate
 * limiter + everything from `deps`) plus injected per-call (request +
 * esClient + spaceId).
 */
export interface CommandGatesContext {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
  allowlist: EmulationAllowlist;
  rateLimiter: EmulationRateLimiter;
  request: KibanaRequest;
  esClient: { asCurrentUser: ElasticsearchClient };
  spaceId: string;
  /**
   * PROD-2: actor attribution for the dispatched response action's
   * audit comment. Each per-family tool builds this from its
   * `runContext` + `callContext.toolCallId` so the comment carries
   * `via=agent-builder ...` straight through to the audit trail.
   * Optional for backward compat with any future non-tool caller.
   */
  actorContext?: ActorContext;
}

/**
 * Each per-family tool re-parses its raw input with the central
 * {@link RunEmulationCommandInputSchema} discriminated union BEFORE
 * calling this helper, so by the time we get here `cmd` is the
 * strictly-typed `RunEmulationCommandInput` — same shape the REST
 * route uses. The gates helper does not re-validate `parameters`.
 */
export type GatedCommand = RunEmulationCommandInput;

/**
 * The shape every per-family tool returns. Mirrors the
 * `BuiltinSkillBoundedTool` handler return contract.
 */
type ToolResult =
  | {
      results: Array<{ type: typeof ToolResultType.error; data: Record<string, unknown> }>;
    }
  | {
      results: Array<{ type: typeof ToolResultType.other; data: Record<string, unknown> }>;
    };

const errorResult = (data: Record<string, unknown>): ToolResult => ({
  results: [{ type: ToolResultType.error, data }],
});

/**
 * Run the standard emulation gate sequence around a single command
 * dispatch. Consolidates the gates that each of the four per-family
 * tools (process, file, network, execution) was duplicating after the
 * I5 split.
 *
 * Gate order (matches the original monolithic runEmulationCommand
 * handler — fail-fast cheapest checks first):
 *   1. Real-execution feature flag
 *   2. Per-command RBAC (Endpoint Authz)
 *   3. Host allowlist (operator-controlled list of permitted endpoints)
 *   4. Atomic rate-limit acquire (per-space + per-host windows;
 *      release on failure)
 *   5. Authenticated caller (defense-in-depth — emulation must be attributable)
 *
 * On any gate failure the helper returns a structured error result. On
 * runner failure (typed runner errors or generic throw) the rate-limit
 * slot is released so a client retry isn't penalised for the failed
 * attempt. On success the helper returns the standard `success: true`
 * result with the action id.
 */
export const withCommandGates = async (
  ctx: CommandGatesContext,
  cmd: GatedCommand
): Promise<ToolResult> => {
  const {
    logger,
    allowlist,
    rateLimiter,
    config,
    endpointService,
    core,
    request,
    esClient,
    spaceId,
    actorContext,
  } = ctx;
  const { emulationId, agentType, endpointIds, command } = cmd;

  // Track the rate-limit token across the full handler so we can release
  // it from any post-acquire failure path (typed runner errors or generic
  // catches). `undefined` until Gate 4 acquires.
  let rateLimitToken: ReturnType<typeof rateLimiter.acquire>['token'];

  try {
    // ── Gate 1: Feature flag + runtime kill switch ─────────────────────────
    // Two knobs gate real execution: the static `experimentalFeatures` flag
    // (ships dark; restart to flip) and the runtime
    // `detectionEmulation.realExecutionEnabled` kill switch (defaults to true;
    // operators flip via `kibana.yml` reload to halt new dispatches without
    // a restart). The disable-reason helper picks whichever knob actually
    // closed so the error response steers operators to the right config key.
    const featureFlags = getDetectionEmulationFeatureFlags(config);
    if (!isRealExecutionEnabled(featureFlags)) {
      const disableReason = getRealExecutionDisableReason(featureFlags);
      const likelyCause = disableReason
        ? REAL_EXECUTION_DISABLE_REASON_TEXT[disableReason]
        : 'Real-execution dispatch is disabled';
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked: real execution is disabled (${
          disableReason ?? 'unknown'
        })`
      );
      return errorResult({
        error_type: 'feature_disabled',
        message: 'Detection emulation real execution is disabled',
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 403,
        likely_cause: likelyCause,
        disable_reason: disableReason ?? undefined,
      });
    }

    // ── Gate 2: Per-command RBAC ────────────────────────────────────────────
    // Missing entries in the RBAC map mean "no extra privilege required"
    // (e.g. `cancel` has no dedicated privilege today).
    const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
    const rbacMap = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL as Record<
      string,
      string | undefined
    >;
    const requiredRbacFeature = rbacMap[consoleCommand];

    if (requiredRbacFeature) {
      const endpointAuthz = await endpointService.getEndpointAuthz(request);
      const hasPrivilege = (endpointAuthz as unknown as Record<string, boolean | undefined>)[
        requiredRbacFeature
      ];

      if (!hasPrivilege) {
        logger.warn(
          `Emulation command [${command}] for emulation [${emulationId}] blocked: user lacks required RBAC privilege [${requiredRbacFeature}]`
        );
        return errorResult({
          error_type: 'authorization_error',
          message: `Insufficient privileges: command [${command}] requires [${requiredRbacFeature}]`,
          emulation_id: emulationId,
          agent_type: agentType,
          command,
          status_code: 403,
          likely_cause: `User lacks required RBAC privilege [${requiredRbacFeature}]`,
        });
      }

      logger.debug(
        `RBAC check passed for command [${command}]: user has privilege [${requiredRbacFeature}]`
      );
    }

    // ── Gate 3: Host allowlist ──────────────────────────────────────────────
    const allowlistResult = allowlist.validate(endpointIds);
    if (!allowlistResult.allowed) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by allowlist: ${allowlistResult.error}`
      );
      return errorResult({
        error_type: 'authorization_error',
        message: allowlistResult.error ?? 'Endpoints not in allowlist',
        blocked_endpoints: allowlistResult.blockedEndpoints,
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 403,
        likely_cause: 'One or more endpoints not in allowlist',
      });
    }

    // ── Gate 4: Atomic rate-limit acquire ───────────────────────────────────
    //
    // PROD-4: endpointIds is forwarded so the limiter also enforces the
    // per-host bucket. If any host is over capacity the call is rejected
    // before any reservation lands and `blocked_endpoints` tells the
    // LLM (and the operator reading the audit trail) which hosts are
    // saturated. Because the per-family tools always target a non-empty
    // endpointIds (it's required by their schema), per-host limiting
    // always engages here.
    const acquireResult = rateLimiter.acquire(spaceId, emulationId, command, endpointIds);
    if (!acquireResult.allowed) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${acquireResult.error}`
      );
      return errorResult({
        error_type: 'rate_limit_error',
        message: acquireResult.error ?? 'Rate limit exceeded',
        current_count: acquireResult.currentCount,
        max_commands: acquireResult.maxCommands,
        reset_ms: acquireResult.resetMs,
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 429,
        likely_cause:
          acquireResult.blockedEndpoints && acquireResult.blockedEndpoints.length > 0
            ? 'Per-host rate limit exceeded for one or more endpoints'
            : 'Rate limit exceeded for this space',
        ...(acquireResult.blockedEndpoints
          ? { blocked_endpoints: acquireResult.blockedEndpoints }
          : {}),
      });
    }
    rateLimitToken = acquireResult.token;

    // ── Gate 5: Authenticated caller (defense-in-depth) ─────────────────────
    // Cases is acquired through `endpointService.getCasesClient` rather
    // than direct plugin access — security_solution's core start
    // dependencies do not register the cases plugin. We swallow lookup
    // failures because the cases client is optional for emulation
    // dispatch.
    const [coreStart] = await core.getStartServices();
    let casesClient;
    try {
      casesClient = await endpointService.getCasesClient(request);
    } catch (casesErr) {
      logger.debug(
        `Cases client unavailable for emulation dispatch: ${
          (casesErr as Error).message ?? casesErr
        }`
      );
      casesClient = undefined;
    }
    const currentUser = await coreStart.security?.authc.getCurrentUser(request);
    if (!currentUser?.username) {
      rateLimiter.release(rateLimitToken);
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked: no authenticated user`
      );
      return errorResult({
        error_type: 'authorization_error',
        message: 'Authentication is required to run an emulation command.',
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 401,
        likely_cause: 'No current user attached to the request.',
      });
    }

    // ── Dispatch via EmulationRunner ────────────────────────────────────────
    // Rule-binding lookup (I7): the SO type is `hidden: true`, so we need
    // the *internal* SO client — the request-scoped client cannot read
    // hidden types. We pass the lookup factory rather than a fixed
    // (ruleId, ruleName) pair so the runner only pays the lookup cost
    // once per dispatch and tests can stub it.
    const internalSoClient = coreStart.savedObjects.createInternalRepository([
      emulationRuleBindingTypeName,
    ]);
    const ruleBindingLookup = createSavedObjectRuleBindingLookup(
      // createInternalRepository returns an `ISavedObjectsRepository` which
      // implements the `SavedObjectsClientContract` shape we need (find /
      // search). Cast through `unknown` to avoid pulling the repository
      // typing into our public surface.
      internalSoClient as unknown as Parameters<typeof createSavedObjectRuleBindingLookup>[0],
      logger
    );

    const runner = new EmulationRunner({
      endpointService,
      esClient: esClient.asCurrentUser,
      spaceId,
      casesClient,
      username: currentUser.username,
      logger,
      ruleBindingLookup,
      actorContext,
    });

    // The per-family tool already re-parsed against the strict union —
    // forward the typed `RunEmulationCommandInput` to the runner.
    const result = await runner.run(cmd);

    if (result.status === 'error') {
      // Roll the rate-limit acquire back so retries are not penalised.
      rateLimiter.release(rateLimitToken);
      return errorResult({
        error_type: 'execution_error',
        message: 'Failed to dispatch the emulation command.',
        action_id: result.actionId,
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 502,
        likely_cause: 'Internal error during command execution',
      });
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            success: true,
            action_id: result.actionId,
            agent_type: result.agentType,
            command: result.command,
            status: result.status,
            emulation_id: emulationId,
            endpoint_count: endpointIds.length,
          },
        },
      ],
    };
  } catch (err) {
    rateLimiter.release(rateLimitToken);
    const error = err as Error;

    // Map typed runner errors → caller-facing classifications. We never
    // echo raw error messages back to the LLM in the unknown case;
    // that's logged server-side only (matches I3 in the REST route).
    if (error instanceof UnsupportedAgentTypeError) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] rejected: ${error.message}`
      );
      return errorResult({
        error_type: 'unsupported_agent_type',
        message: error.message,
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 400,
        likely_cause: 'Selected agent type is not supported by this build.',
      });
    }

    if (error instanceof UnsupportedCommandForAgentTypeError) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] rejected: ${error.message}`
      );
      return errorResult({
        error_type: 'unsupported_command_for_agent_type',
        message: error.message,
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 400,
        likely_cause: 'This command is not supported for the selected agent type.',
      });
    }

    if (error instanceof MissingConnectorActionsError) {
      logger.error(
        `Emulation command [${command}] for emulation [${emulationId}] failed: ${error.message}`
      );
      return errorResult({
        error_type: 'missing_connector_actions',
        message:
          'Missing connector configuration required to dispatch this command. Please contact an administrator.',
        emulation_id: emulationId,
        agent_type: agentType,
        command,
        status_code: 500,
        likely_cause: 'Server-side wiring is incomplete for this agent type.',
      });
    }

    logger.error(
      `Failed to execute emulation command [${command}] for emulation [${emulationId}]: ${error.message}`,
      { tags: ['detection-emulation'], stack: error.stack } as Record<string, unknown>
    );

    return errorResult({
      error_type: 'execution_error',
      message: 'Failed to execute the emulation command.',
      emulation_id: emulationId,
      agent_type: agentType,
      command,
      status_code: 500,
      likely_cause: 'Internal error during command execution',
    });
  }
};
