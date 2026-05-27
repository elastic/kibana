/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common';
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
import { createSavedObjectRuleBindingLookup } from '../../../lib/detection_emulation/rule_binding_lookup';
import { emulationRuleBindingTypeName } from '../../../lib/detection_emulation/rule_binding';
import { resolveCurrentUsername } from '../../../lib/detection_emulation/resolve_current_user';
import { toolError, type EmulationErrorContext } from './emulation_tool_errors';
import {
  checkRealExecutionFeatureFlags,
  checkValidation,
  checkRbac,
  resolveEffectiveConfig,
  checkAllowlist,
  acquireRateLimit,
  checkAuth,
} from '../../../lib/detection_emulation/execution/gate_checks';
import { runStep } from '../../../lib/detection_emulation/execution/pipeline_step_error';

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
  savedObjectsClient?: SavedObjectsClientContract;
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
    savedObjectsClient,
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
    const ffResult = checkRealExecutionFeatureFlags(config);
    if (!ffResult.ok) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked: ${ffResult.message}`
      );
      return toolError.featureDisabled(errCtx, {
        message: ffResult.message,
        likelyCause: (ffResult.extra?.likely_cause as string) ?? 'Feature disabled',
        disableReason: ffResult.extra?.disable_reason as string | undefined,
      });
    }

    // ── Gate 1.5: Validation gates (curatedOnly + allowedScriptIds) ─────────
    const validationResult = checkValidation(cmd, config);
    if (!validationResult.ok) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by validation gate [${validationResult.reason}]: ${validationResult.message}`
      );
      return toolError.validationGateBlocked(errCtx, {
        reason: validationResult.reason,
        message: validationResult.message,
      });
    }

    // ── Gate 2: Per-command RBAC ────────────────────────────────────────────
    const rbacResult = await runStep('rbac_check', 2, () =>
      checkRbac(endpointService, request, esClient.asCurrentUser, command)
    );
    if (!rbacResult.ok) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked: ${rbacResult.message}`
      );
      return toolError.authorizationError(errCtx, {
        message: rbacResult.message,
        likelyCause: (rbacResult.extra?.likely_cause as string) ?? 'RBAC check failed',
      });
    }
    logger.debug(`RBAC check passed for command [${command}]`);

    // ── Per-request guardrail resolution ────────────────────────────────────
    const [coreStart] = await core.getStartServices();
    const soClient = savedObjectsClient ?? coreStart.savedObjects.getScopedClient(request);
    const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
    const { effectiveAllowlist, effectiveRateLimiter } = await runStep(
      'resolve_guardrail_config',
      3,
      () =>
        resolveEffectiveConfig({
          uiSettingsClient,
          config,
          logger,
          rateLimiterConfig: rateLimiter.getConfig(),
        })
    );

    // ── Gate 3: Host allowlist ──────────────────────────────────────────────
    const allowlistResult = checkAllowlist(allowlist, endpointIds, effectiveAllowlist);
    if (!allowlistResult.ok) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by allowlist: ${allowlistResult.message}`
      );
      return toolError.authorizationError(errCtx, {
        message: allowlistResult.message,
        likelyCause: (allowlistResult.extra?.likely_cause as string) ?? 'Allowlist check failed',
        blockedEndpoints: allowlistResult.extra?.blocked_endpoints as string[] | undefined,
      });
    }

    // ── Gate 3.5: Idempotency cache ────────────────────────────────────────
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
    const rateLimitResult = acquireRateLimit(
      rateLimiter,
      spaceId,
      emulationId,
      command,
      endpointIds,
      effectiveRateLimiter
    );
    if (!rateLimitResult.ok) {
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${rateLimitResult.message}`
      );
      return toolError.rateLimitExceeded(errCtx, {
        error: rateLimitResult.message,
        currentCount: rateLimitResult.extra?.current_count as number | undefined,
        maxCommands: rateLimitResult.extra?.max_commands as number | undefined,
        resetMs: rateLimitResult.extra?.reset_ms as number | undefined,
        blockedEndpoints: rateLimitResult.extra?.blocked_endpoints as string[] | undefined,
      });
    }
    rateLimitToken = rateLimitResult.value.token;

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
    const authResult = await runStep('auth_check', 5, () =>
      checkAuth(resolveCurrentUsername, {
        request,
        security: coreStart.security,
        esClient: esClient.asCurrentUser,
      })
    );
    if (!authResult.ok) {
      rateLimiter.release(rateLimitToken);
      logger.warn(
        `Emulation command [${command}] for emulation [${emulationId}] blocked: no authenticated user`
      );
      return toolError.authenticationRequired(errCtx);
    }
    const username = authResult.value.username;

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

    const result = await runStep('runner_dispatch', 6, () => runner.run(cmd));

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
