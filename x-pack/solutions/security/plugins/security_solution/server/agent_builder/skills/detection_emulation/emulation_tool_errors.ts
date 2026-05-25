/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';

/**
 * Common fields present on every emulation tool error response.
 * Passed once at the call site; the builder merges them into the
 * structured error shape automatically.
 */
export interface EmulationErrorContext {
  emulation_id?: string;
  agent_type?: string;
  command?: string;
  rule_id?: string;
  mode?: string;
}

interface ToolErrorResult {
  results: Array<{ type: typeof ToolResultType.error; data: Record<string, unknown> }>;
}

const errorResult = (
  ctx: EmulationErrorContext,
  data: Record<string, unknown>
): ToolErrorResult => ({
  results: [
    {
      type: ToolResultType.error,
      data: {
        ...(ctx.emulation_id != null ? { emulation_id: ctx.emulation_id } : {}),
        ...(ctx.agent_type != null ? { agent_type: ctx.agent_type } : {}),
        ...(ctx.command != null ? { command: ctx.command } : {}),
        ...(ctx.rule_id != null ? { rule_id: ctx.rule_id } : {}),
        ...(ctx.mode != null ? { mode: ctx.mode } : {}),
        ...data,
      },
    },
  ],
});

export const toolError = {
  featureDisabled: (
    ctx: EmulationErrorContext,
    opts: { message: string; likelyCause: string; disableReason?: string }
  ): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'feature_disabled',
      message: opts.message,
      status_code: 403,
      likely_cause: opts.likelyCause,
      ...(opts.disableReason ? { disable_reason: opts.disableReason } : {}),
    }),

  authorizationError: (
    ctx: EmulationErrorContext,
    opts: { message: string; likelyCause: string; blockedEndpoints?: string[] }
  ): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'authorization_error',
      message: opts.message,
      status_code: 403,
      likely_cause: opts.likelyCause,
      ...(opts.blockedEndpoints ? { blocked_endpoints: opts.blockedEndpoints } : {}),
    }),

  authenticationRequired: (ctx: EmulationErrorContext): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'authorization_error',
      message: 'Authentication is required to run an emulation command.',
      status_code: 401,
      likely_cause: 'No current user attached to the request.',
    }),

  userDeclined: (ctx: EmulationErrorContext): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'user_declined',
      message: 'User declined to dispatch the live response actions for this rule.',
      status_code: 403,
      likely_cause:
        'Operator cancelled the confirmation prompt; do not retry without an explicit user instruction.',
    }),

  rateLimitExceeded: (
    ctx: EmulationErrorContext,
    opts: {
      error?: string;
      currentCount?: number;
      maxCommands?: number;
      resetMs?: number;
      blockedEndpoints?: string[];
    }
  ): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'rate_limit_error',
      message: opts.error ?? 'Rate limit exceeded.',
      current_count: opts.currentCount,
      max_commands: opts.maxCommands,
      reset_ms: opts.resetMs,
      status_code: 429,
      likely_cause:
        opts.blockedEndpoints && opts.blockedEndpoints.length > 0
          ? 'Per-host rate limit exceeded for one or more endpoints.'
          : 'Rate limit exceeded for this space.',
      ...(opts.blockedEndpoints ? { blocked_endpoints: opts.blockedEndpoints } : {}),
    }),

  invalidParameters: (ctx: EmulationErrorContext): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'invalid_parameters',
      message: 'Invalid parameters for the requested command.',
      status_code: 400,
      likely_cause:
        'The provided `parameters` do not match the expected shape for this command (see schema description for the required fields).',
    }),

  validationGateBlocked: (
    ctx: EmulationErrorContext,
    opts: { reason: string; message: string }
  ): ToolErrorResult =>
    errorResult(ctx, {
      error_type: opts.reason,
      message: opts.message,
      status_code: 403,
      likely_cause:
        opts.reason === 'not_in_curated_library'
          ? 'Curated-only mode rejects commands not present in the bundled payload library.'
          : 'Script ID is not on the operator allow-list.',
    }),

  unsupportedAgentType: (ctx: EmulationErrorContext, message: string): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'unsupported_agent_type',
      message,
      status_code: 400,
      likely_cause: 'Selected agent type is not supported by this build.',
    }),

  unsupportedCommandForAgentType: (ctx: EmulationErrorContext, message: string): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'unsupported_command_for_agent_type',
      message,
      status_code: 400,
      likely_cause: 'This command is not supported for the selected agent type.',
    }),

  missingConnectorActions: (ctx: EmulationErrorContext): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'missing_connector_actions',
      message:
        'Missing connector configuration required to dispatch this command. Please contact an administrator.',
      status_code: 500,
      likely_cause: 'Server-side wiring is incomplete for this agent type.',
    }),

  executionError: (
    ctx: EmulationErrorContext,
    opts?: { message?: string; likelyCause?: string; actionId?: string }
  ): ToolErrorResult =>
    errorResult(ctx, {
      error_type: 'execution_error',
      message: opts?.message ?? 'Failed to execute the emulation command.',
      status_code: 500,
      likely_cause: opts?.likelyCause ?? 'Internal error during command execution',
      ...(opts?.actionId ? { action_id: opts.actionId } : {}),
    }),

  concurrencyExceeded: (
    ctx: EmulationErrorContext,
    opts: { inflightScenarioFingerprint?: string; retryAfterSeconds?: number }
  ): ToolErrorResult =>
    errorResult(ctx, {
      error:
        'Another real_execution scenario is already in flight for this Kibana space. Concurrent real_execution scenarios are not allowed.',
      reason: 'concurrency_exceeded',
      inflight_scenario_fingerprint: opts.inflightScenarioFingerprint,
      retry_after_seconds: opts.retryAfterSeconds,
      likely_cause:
        'Another real_execution scenario is currently in flight for this space. Wait for it to complete or retry after the suggested interval.',
    }),

  scenarioFailure: (
    ctx: EmulationErrorContext,
    reason: 'rule_not_found' | 'no_mitre_tags' | 'no_supported_techniques' | string
  ): ToolErrorResult => {
    const data = scenarioFailureMap[reason as keyof typeof scenarioFailureMap] ?? {
      error_type: 'scenario_error',
      message: 'Failed to generate an emulation scenario for this rule.',
      status_code: 500,
    };
    return errorResult(ctx, data);
  },
};

const scenarioFailureMap = {
  rule_not_found: {
    error_type: 'rule_not_found',
    message: 'The specified rule was not found.',
    status_code: 404,
  },
  no_mitre_tags: {
    error_type: 'no_mitre_tags',
    message: 'The rule has no MITRE ATT&CK technique tags.',
    status_code: 422,
  },
  no_supported_techniques: {
    error_type: 'no_supported_techniques',
    message: "None of the rule's techniques have emulation payloads in the library.",
    status_code: 422,
  },
} as const;
