/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { EmulationAllowlist } from './allowlist';
import type { EmulationRateLimiter } from './rate_limiter';
import {
  getDetectionEmulationFeatureFlags,
  getRealExecutionDisableReason,
  isRealExecutionEnabled,
  REAL_EXECUTION_DISABLE_REASON_TEXT,
} from '../feature_flag';
import {
  resolveAllowlistConfig,
  resolveRateLimiterConfig,
} from '../runtime_config_resolver';
import {
  checkValidationGates,
  resolveValidationGateConfig,
} from './validation_gate';
import type { RunEmulationCommandInput } from '../../../../common/detection_emulation/schemas';

// ─── Result types ──────────────────────────────────────────────────────────────

export type GateOk<T = void> = { ok: true } & (T extends void ? {} : { value: T });
export type GateFail = {
  ok: false;
  reason: string;
  message: string;
  statusCode: number;
  extra?: Record<string, unknown>;
};
export type GateResult<T = void> = GateOk<T> | GateFail;

const pass = <T = void>(value?: T): GateResult<T> =>
  (value !== undefined ? { ok: true, value } : { ok: true }) as GateResult<T>;

const fail = (
  reason: string,
  message: string,
  statusCode: number,
  extra?: Record<string, unknown>
): GateFail => ({
  ok: false,
  reason,
  message,
  statusCode,
  extra,
});

// ─── Gate 1: Feature flags ─────────────────────────────────────────────────────

export function checkRealExecutionFeatureFlags(config: ConfigType): GateResult {
  const featureFlags = getDetectionEmulationFeatureFlags(config);
  if (!isRealExecutionEnabled(featureFlags)) {
    const disableReason = getRealExecutionDisableReason(featureFlags);
    const likelyCause = disableReason
      ? REAL_EXECUTION_DISABLE_REASON_TEXT[disableReason]
      : 'Real-execution dispatch is disabled';
    return fail('feature_disabled', 'Detection emulation real execution is disabled', 403, {
      likely_cause: likelyCause,
      disable_reason: disableReason ?? undefined,
    });
  }
  return pass();
}

export function checkModeFeatureFlags(
  config: ConfigType,
  mode: 'real_execution' | 'log_injection'
): GateResult {
  const featureFlags = getDetectionEmulationFeatureFlags(config);
  if (mode === 'log_injection' && !featureFlags.logInjection) {
    return fail(
      'feature_disabled',
      'Detection emulation log injection is disabled.',
      403,
      { likely_cause: 'Feature flag detectionEmulationLogInjection is not enabled.' }
    );
  }
  if (
    mode === 'real_execution' &&
    (!featureFlags.realExecution || !featureFlags.realExecutionRuntimeEnabled)
  ) {
    const disableReason = getRealExecutionDisableReason(featureFlags);
    return fail('feature_disabled', 'Detection emulation real execution is disabled.', 403, {
      likely_cause: disableReason
        ? REAL_EXECUTION_DISABLE_REASON_TEXT[disableReason]
        : 'Real-execution dispatch is disabled.',
      disable_reason: disableReason ?? undefined,
    });
  }
  return pass();
}

// ─── Gate 1.5: Validation gates ────────────────────────────────────────────────

export function checkValidation(
  cmd: RunEmulationCommandInput,
  config: ConfigType
): GateResult {
  const validationGateConfig = resolveValidationGateConfig(config.detectionEmulation?.validation);
  const result = checkValidationGates(cmd, validationGateConfig);
  if (!result.allowed) {
    return fail(result.reason, result.message, 403, {
      likely_cause:
        result.reason === 'not_in_curated_library'
          ? 'Curated-only mode rejects commands not present in the bundled payload library.'
          : 'Script ID is not on the operator allow-list.',
    });
  }
  return pass();
}

// ─── Gate 2: Per-command RBAC ──────────────────────────────────────────────────

export async function checkRbac(
  endpointService: EndpointAppContextService,
  request: KibanaRequest,
  esClient: ElasticsearchClient,
  command: string
): Promise<GateResult> {
  const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
  const requiredAuthzKey = RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[consoleCommand];

  if (!requiredAuthzKey) {
    return pass();
  }

  const endpointAuthz = await endpointService.getEndpointAuthz(request, esClient);
  const hasPrivilege = endpointAuthz[requiredAuthzKey];

  if (!hasPrivilege) {
    return fail(
      'authorization_error',
      `Insufficient privileges: command [${command}] requires [${requiredAuthzKey}]`,
      403,
      { likely_cause: `User lacks required RBAC privilege [${requiredAuthzKey}]` }
    );
  }

  return pass();
}

// ─── Gate 3: Host allowlist ────────────────────────────────────────────────────

export interface ResolveGuardrailConfigDeps {
  uiSettingsClient: IUiSettingsClient;
  config: ConfigType;
  logger: Logger;
  rateLimiterConfig: ReturnType<EmulationRateLimiter['getConfig']>;
}

export async function resolveEffectiveConfig(deps: ResolveGuardrailConfigDeps) {
  const [effectiveAllowlist, effectiveRateLimiter] = await Promise.all([
    resolveAllowlistConfig({
      uiSettingsClient: deps.uiSettingsClient,
      config: deps.config,
      logger: deps.logger,
    }),
    resolveRateLimiterConfig({
      uiSettingsClient: deps.uiSettingsClient,
      config: deps.config,
      logger: deps.logger,
      constructorConfig: deps.rateLimiterConfig,
    }),
  ]);
  return { effectiveAllowlist, effectiveRateLimiter };
}

export function checkAllowlist(
  allowlist: EmulationAllowlist,
  endpointIds: readonly string[],
  effectiveAllowlistConfig: Awaited<ReturnType<typeof resolveAllowlistConfig>>
): GateResult {
  const result = allowlist.validate(endpointIds, effectiveAllowlistConfig);
  if (!result.allowed) {
    return fail('authorization_error', result.error ?? 'Endpoints not in allowlist', 403, {
      likely_cause: 'One or more endpoints not in allowlist',
      blocked_endpoints: result.blockedEndpoints,
    });
  }
  return pass();
}

// ─── Gate 4: Rate limiter ──────────────────────────────────────────────────────

export function acquireRateLimit(
  rateLimiter: EmulationRateLimiter,
  spaceId: string,
  emulationId: string,
  command: string,
  endpointIds: readonly string[],
  effectiveConfig: Awaited<ReturnType<typeof resolveRateLimiterConfig>>
): GateResult<{ token: ReturnType<EmulationRateLimiter['acquire']>['token'] }> {
  const result = rateLimiter.acquire(spaceId, emulationId, command, endpointIds, effectiveConfig);
  if (!result.allowed) {
    return fail('rate_limit_error', result.error ?? 'Rate limit exceeded.', 429, {
      current_count: result.currentCount,
      max_commands: result.maxCommands,
      reset_ms: result.resetMs,
      likely_cause:
        result.blockedEndpoints && result.blockedEndpoints.length > 0
          ? 'Per-host rate limit exceeded for one or more endpoints.'
          : 'Rate limit exceeded for this space.',
      ...(result.blockedEndpoints ? { blocked_endpoints: result.blockedEndpoints } : {}),
    });
  }
  return pass({ token: result.token });
}

// ─── Gate 5: Authenticated caller ──────────────────────────────────────────────

export interface CheckAuthDeps {
  request: KibanaRequest;
  security: { authc: { getCurrentUser: (req: KibanaRequest) => unknown } };
  esClient: ElasticsearchClient;
}

export async function checkAuth(
  resolveUsername: (deps: {
    request: KibanaRequest;
    security: unknown;
    esClient: ElasticsearchClient;
  }) => Promise<string | undefined>,
  deps: CheckAuthDeps
): Promise<GateResult<{ username: string }>> {
  const username = await resolveUsername({
    request: deps.request,
    security: deps.security,
    esClient: deps.esClient,
  });
  if (!username) {
    return fail(
      'authorization_error',
      'Authentication is required to run an emulation command.',
      401,
      { likely_cause: 'No current user attached to the request.' }
    );
  }
  return pass({ username });
}
