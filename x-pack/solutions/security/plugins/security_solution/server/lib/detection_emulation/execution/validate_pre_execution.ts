/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { EmulationAllowlist } from './allowlist';
import type { EmulationRateLimiter } from './rate_limiter';
import { resolveCurrentUsername } from '../resolve_current_user';
import {
  checkModeFeatureFlags,
  checkRbac,
  checkAllowlist,
  checkAuth,
  acquireRateLimit,
  resolveEffectiveConfig,
} from './gate_checks';
import type { GateFail } from './gate_checks';
import type { TracedLogger } from './traced_logger';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../common/endpoint/service/response_actions/constants';

/**
 * Pre-execution validation result. Inspired by the `assertWorkflowsEnabled()`
 * pattern in andrew-goldstein's API routes (PR #260744), which validates all
 * preconditions up-front and returns a structured issues array rather than
 * throwing/returning errors inline across 100+ lines of gate code.
 *
 * The `validatePreExecution` function runs the full gate sequence for the
 * `validateRule` tool:
 *   1. Feature flag gate (mode-aware)
 *   2. Authenticated caller
 *   3. RBAC (real_execution only)
 *   4. Allowlist (real_execution only)
 *   5. Rate limit acquire (real_execution only)
 *
 * On success, returns the resolved username and rate-limit token (if applicable).
 * On failure, returns the first blocking gate's structured `GateFail`.
 */

export interface PreExecutionSuccess {
  valid: true;
  username: string;
  rateLimitToken?: ReturnType<EmulationRateLimiter['acquire']>['token'];
  effectiveAllowlist?: Awaited<ReturnType<typeof import('../runtime_config_resolver').resolveAllowlistConfig>>;
  effectiveRateLimiter?: Awaited<ReturnType<typeof import('../runtime_config_resolver').resolveRateLimiterConfig>>;
}

export interface PreExecutionFailure {
  valid: false;
  gate: GateFail;
}

export type PreExecutionResult = PreExecutionSuccess | PreExecutionFailure;

export interface ValidatePreExecutionDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: TracedLogger;
  allowlist: EmulationAllowlist;
  rateLimiter: EmulationRateLimiter;
  request: KibanaRequest;
  esClient: { asCurrentUser: ElasticsearchClient };
  spaceId: string;
}

export interface ValidatePreExecutionInput {
  ruleId: string;
  endpointIds: string[];
  mode: 'log_injection' | 'real_execution';
}

/**
 * Run the full pre-execution gate sequence for the validateRule tool.
 *
 * Consolidates the 5 inline gate checks (spread across ~120 lines in
 * `validate_rule_tool.ts`) into a single function that returns a
 * discriminated union: `{ valid: true, username, rateLimitToken }` or
 * `{ valid: false, gate: GateFail }`.
 *
 * The caller maps the `GateFail` to the appropriate `toolError.*` or
 * HTTP response — this function is transport-agnostic.
 */
export async function validatePreExecution(
  deps: ValidatePreExecutionDeps,
  input: ValidatePreExecutionInput
): Promise<PreExecutionResult> {
  const {
    core,
    endpointService,
    config,
    logger,
    allowlist,
    rateLimiter,
    request,
    esClient,
    spaceId,
  } = deps;
  const { ruleId, endpointIds, mode } = input;

  // Gate 1: Feature flag (mode-aware)
  const ffResult = checkModeFeatureFlags(config, mode);
  if (!ffResult.ok) {
    logger.warn(`Gate 1 (feature flag) blocked: ${ffResult.message}`);
    return { valid: false, gate: ffResult };
  }

  // Gate 2: Authenticated caller
  const [coreStart] = await core.getStartServices();
  const authResult = await checkAuth(resolveCurrentUsername, {
    request,
    security: coreStart.security as any,
    esClient: esClient.asCurrentUser,
  });
  if (!authResult.ok) {
    logger.warn('Gate 2 (auth) blocked: no authenticated user');
    return { valid: false, gate: authResult };
  }
  const username = authResult.value.username;

  // Gates 3–5 only apply to real_execution
  if (mode !== 'real_execution') {
    return { valid: true, username };
  }

  // Gate 3: RBAC
  const rbacResult = await checkRbac(
    endpointService,
    request,
    esClient.asCurrentUser,
    RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP.execute
  );
  if (!rbacResult.ok) {
    logger.warn(`Gate 3 (RBAC) blocked: ${rbacResult.message}`);
    return { valid: false, gate: rbacResult };
  }

  // Resolve effective config for allowlist + rate limiter
  const soClient = coreStart.savedObjects.getScopedClient(request);
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  const { effectiveAllowlist, effectiveRateLimiter } = await resolveEffectiveConfig({
    uiSettingsClient,
    config,
    logger: logger.raw,
    rateLimiterConfig: rateLimiter.getConfig(),
  });

  // Gate 4: Allowlist
  const allowlistResult = checkAllowlist(allowlist, endpointIds, effectiveAllowlist);
  if (!allowlistResult.ok) {
    logger.warn(`Gate 4 (allowlist) blocked: ${allowlistResult.message}`);
    return { valid: false, gate: allowlistResult };
  }

  // Gate 5: Rate limit
  const rateLimitResult = acquireRateLimit(
    rateLimiter,
    spaceId,
    ruleId,
    'validate-rule',
    endpointIds,
    effectiveRateLimiter
  );
  if (!rateLimitResult.ok) {
    logger.warn(`Gate 5 (rate limit) blocked: ${rateLimitResult.message}`);
    return { valid: false, gate: rateLimitResult };
  }

  return {
    valid: true,
    username,
    rateLimitToken: rateLimitResult.value.token,
    effectiveAllowlist,
    effectiveRateLimiter,
  };
}
