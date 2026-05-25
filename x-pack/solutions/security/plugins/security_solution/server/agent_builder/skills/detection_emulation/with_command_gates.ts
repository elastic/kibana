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
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
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
import type { EmulationIdempotencyCache } from '../../../lib/detection_emulation/execution/idempotency_cache';
import { buildIdempotencyKey } from '../../../lib/detection_emulation/execution/idempotency_cache';
import type { ActorContext } from '../../../lib/detection_emulation/execution/audit_context';
import {
  getDetectionEmulationFeatureFlags,
  getRealExecutionDisableReason,
  isRealExecutionEnabled,
  REAL_EXECUTION_DISABLE_REASON_TEXT,
} from '../../../lib/detection_emulation/feature_flag';
import { createSavedObjectRuleBindingLookup } from '../../../lib/detection_emulation/rule_binding_lookup';
import { emulationRuleBindingTypeName } from '../../../lib/detection_emulation/rule_binding';
import {
  resolveAllowlistConfig,
  resolveRateLimiterConfig,
} from '../../../lib/detection_emulation/runtime_config_resolver';
import {
  checkValidationGates,
  resolveValidationGateConfig,
} from '../../../lib/detection_emulation/execution/validation_gate';
import { resolveCurrentUsername } from './resolve_current_user';
import { toolError, type EmulationErrorContext } from './emulation_tool_errors';

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
  idempotencyCache?: EmulationIdempotencyCache;
  request: KibanaRequest;
  esClient: { asCurrentUser: ElasticsearchClient };
  spaceId: string;
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

type ToolResult =
  | {
      results: Array<{ type: typeof ToolResultType.error; data: Record<string, unknown> }>;
    }
  | {
      results: Array<{ type: typeof ToolResultType.other; data: Record<string, unknown> }>;
    };

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
    idempotencyCache,
    config,
    endpointService,
    core,
    request,
    esClient,
    spaceId,
    actorContext,
  } = ctx;
  const { emulationId, agentType, endpointIds, command } = cmd;
  const errCtx: EmulationErrorContext = {
    emulation_id: emulationId,
    agent_type: agentType,
    command,
  };

  let rateLimitToken: ReturnType<typeof rateLimiter.acquire>['token'];

  try {
    // ── Gate 1: Feature flag + runtime kill switch ─────────────────────────
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
      return toolError.featureDisabled(errCtx, {
        message: 'Detection emulation real execution is disabled',
        likelyCause,
        disableReason: disableReason ?? undefined,
      });
    }

    // ── Gate 1.5: Validation gates (curatedOnly + allowedScriptIds) ─────────
    const validationGateConfig = resolveValidationGateConfig(config.detectionEmulation?.validation);
    const validationGateResult = checkValidationGates(cmd, validationGateConfig);
    if (!validationGateResult.allowed) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by validation gate [${validationGateResult.reason}]: ${validationGateResult.message}`
      );
      return toolError.validationGateBlocked(errCtx, {
        reason: validationGateResult.reason,
        message: validationGateResult.message,
      });
    }

    // ── Gate 2: Per-command RBAC ────────────────────────────────────────────
    const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
    const requiredAuthzKey = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[consoleCommand];

    if (requiredAuthzKey) {
      const endpointAuthz = await endpointService.getEndpointAuthz(request, esClient.asCurrentUser);
      const hasPrivilege = endpointAuthz[requiredAuthzKey];

      if (!hasPrivilege) {
        logger.warn(
          `Emulation command [${command}] for emulation [${emulationId}] blocked: user lacks required RBAC privilege [${requiredAuthzKey}]`
        );
        return toolError.authorizationError(errCtx, {
          message: `Insufficient privileges: command [${command}] requires [${requiredAuthzKey}]`,
          likelyCause: `User lacks required RBAC privilege [${requiredAuthzKey}]`,
        });
      }

      logger.debug(
        `RBAC check passed for command [${command}]: user has privilege [${requiredAuthzKey}]`
      );
    }

    // ── Per-request guardrail resolution ────────────────────────────────────
    const [coreStart] = await core.getStartServices();
    const soClient = coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
    const [effectiveAllowlist, effectiveRateLimiter] = await Promise.all([
      resolveAllowlistConfig({ uiSettingsClient, config, logger }),
      resolveRateLimiterConfig({
        uiSettingsClient,
        config,
        logger,
        constructorConfig: rateLimiter.getConfig(),
      }),
    ]);

    // ── Gate 3: Host allowlist ──────────────────────────────────────────────
    const allowlistResult = allowlist.validate(endpointIds, effectiveAllowlist);
    if (!allowlistResult.allowed) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by allowlist: ${allowlistResult.error}`
      );
      return toolError.authorizationError(errCtx, {
        message: allowlistResult.error ?? 'Endpoints not in allowlist',
        likelyCause: 'One or more endpoints not in allowlist',
        blockedEndpoints: allowlistResult.blockedEndpoints,
      });
    }

    // ── Gate 3.5: Idempotency cache ────────────────────────────────────────
    // Deduplicates double-dispatch from LLM retries or network replays.
    // Mirrors the REST route's idempotency gate so both surfaces are safe.
    if (idempotencyCache) {
      const idempotencyKey = buildIdempotencyKey({
        spaceId,
        emulationId,
        command,
        agentType,
        endpointIds,
      });
      const cached = idempotencyCache.get(spaceId, idempotencyKey);
      if (cached) {
        logger.debug(
          `Idempotency cache replay for emulation [${emulationId}] command [${command}] (action_id=${cached.actionId})`
        );
        if (cached.status === 'dispatched') {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  success: true,
                  action_id: cached.actionId,
                  agent_type: cached.agentType,
                  command: cached.command,
                  status: cached.status,
                  emulation_id: emulationId,
                  endpoint_count: endpointIds.length,
                  idempotent_replay: true,
                },
              },
            ],
          };
        }
        return toolError.executionError(errCtx, {
          message: 'Failed to dispatch the emulation command.',
          likelyCause: 'Internal error during command execution',
          actionId: cached.actionId,
        });
      }
    }

    // ── Gate 4: Atomic rate-limit acquire ───────────────────────────────────
    const acquireResult = rateLimiter.acquire(
      spaceId,
      emulationId,
      command,
      endpointIds,
      effectiveRateLimiter
    );
    if (!acquireResult.allowed) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${acquireResult.error}`
      );
      return toolError.rateLimitExceeded(errCtx, {
        error: acquireResult.error,
        currentCount: acquireResult.currentCount,
        maxCommands: acquireResult.maxCommands,
        resetMs: acquireResult.resetMs,
        blockedEndpoints: acquireResult.blockedEndpoints,
      });
    }
    rateLimitToken = acquireResult.token;

    // ── Gate 5: Authenticated caller (defense-in-depth) ─────────────────────
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
    const username = await resolveCurrentUsername({
      request,
      security: coreStart.security,
      esClient: esClient.asCurrentUser,
    });
    if (!username) {
      rateLimiter.release(rateLimitToken);
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked: no authenticated user`
      );
      return toolError.authenticationRequired(errCtx);
    }

    // ── Dispatch via EmulationRunner ────────────────────────────────────────
    const internalSoClient = coreStart.savedObjects.createInternalRepository([
      emulationRuleBindingTypeName,
    ]);
    const ruleBindingLookup = createSavedObjectRuleBindingLookup(
      internalSoClient as unknown as Parameters<typeof createSavedObjectRuleBindingLookup>[0],
      logger
    );

    const runner = new EmulationRunner({
      endpointService,
      esClient: esClient.asCurrentUser,
      spaceId,
      casesClient,
      username,
      logger,
      ruleBindingLookup,
      actorContext,
    });

    const result = await runner.run(cmd);

    if (result.status === 'error') {
      rateLimiter.release(rateLimitToken);
      if (idempotencyCache) {
        const key = buildIdempotencyKey({ spaceId, emulationId, command, agentType, endpointIds });
        idempotencyCache.set(spaceId, key, {
          actionId: result.actionId,
          agentType,
          command,
          status: 'error',
          error: result.error,
        });
      }
      return toolError.executionError(errCtx, {
        message: 'Failed to dispatch the emulation command.',
        likelyCause: 'Internal error during command execution',
        actionId: result.actionId,
      });
    }

    if (idempotencyCache) {
      const key = buildIdempotencyKey({ spaceId, emulationId, command, agentType, endpointIds });
      idempotencyCache.set(spaceId, key, {
        actionId: result.actionId,
        agentType: result.agentType,
        command: result.command,
        status: result.status,
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

    if (error instanceof UnsupportedAgentTypeError) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] rejected: ${error.message}`
      );
      return toolError.unsupportedAgentType(errCtx, error.message);
    }

    if (error instanceof UnsupportedCommandForAgentTypeError) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] rejected: ${error.message}`
      );
      return toolError.unsupportedCommandForAgentType(errCtx, error.message);
    }

    if (error instanceof MissingConnectorActionsError) {
      logger.error(
        `Emulation command [${command}] for emulation [${emulationId}] failed: ${error.message}`
      );
      return toolError.missingConnectorActions(errCtx);
    }

    logger.error(
      `Failed to execute emulation command [${command}] for emulation [${emulationId}]: ${error.message}`,
      { tags: ['detection-emulation'], stack: error.stack } as Record<string, unknown>
    );

    return toolError.executionError(errCtx);
  }
};
