/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import {
  EmulationRunner,
  UnsupportedAgentTypeError,
  UnsupportedCommandForAgentTypeError,
  MissingConnectorActionsError,
} from '../../../lib/detection_emulation/execution/runner';
import {
  EmulationAllowlist,
  createDefaultAllowlistConfig,
} from '../../../lib/detection_emulation/execution/allowlist';
import {
  EmulationRateLimiter,
  createDefaultRateLimiterConfig,
} from '../../../lib/detection_emulation/execution/rate_limiter';
import {
  getDetectionEmulationFeatureFlags,
  isRealExecutionEnabled,
} from '../../../lib/detection_emulation/feature_flag';
import { createSavedObjectRuleBindingLookup } from '../../../lib/detection_emulation/rule_binding_lookup';
import { emulationRuleBindingTypeName } from '../../../lib/detection_emulation/rule_binding';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { RunEmulationCommandInputSchema } from '../../../../common/detection_emulation/schemas/run_emulation_command_input';

/**
 * Schema exposed to the agent-builder framework.
 *
 * The framework requires `ZodObject` (not a discriminated union) at the
 * tool boundary so it can derive a JSON Schema for the LLM. We keep the
 * boundary permissive (a free-form `parameters` record) and re-validate
 * with the strict {@link RunEmulationCommandInputSchema} discriminated
 * union inside the handler. That way the LLM only sees one shape but
 * any malformed parameters still fail fast before reaching the runner.
 */
const runEmulationCommandSchema = z.object({
  emulationId: z.string().min(1).describe('Unique identifier for the emulation run.'),
  agentType: z
    .enum(RESPONSE_ACTION_AGENT_TYPE)
    .describe(
      'EDR agent type. Only `endpoint` is wired through the route today; selecting another type will return 400 until external connectors are resolved.'
    ),
  endpointIds: z
    .array(z.string().min(1))
    .min(1)
    .describe('Endpoint agent IDs to dispatch the action against (1+).'),
  command: z
    .enum(RESPONSE_ACTION_API_COMMANDS_NAMES)
    .describe(
      'Response-action command. Each command requires a specific `parameters` shape — see the skill content for the table.'
    ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Command-specific parameters. Strictly validated server-side per command (e.g. `{ pid: number }` for kill-process, `{ path: string }` for get-file).'
    ),
});

export interface RunEmulationCommandToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

/**
 * Creates the runEmulationCommand tool for executing emulation commands
 * against any supported EDR agent type (Elastic Defend, Sentinel One, CrowdStrike, Microsoft Defender).
 *
 * This tool delegates directly to the EmulationRunner dispatcher, bypassing the HTTP layer
 * and executing the same guardrails (feature flag, RBAC, allowlist, rate limiter) as the route handler.
 */
export const createRunEmulationCommandTool = (
  deps: RunEmulationCommandToolDeps
): BuiltinSkillBoundedTool<typeof runEmulationCommandSchema> => {
  const { core, endpointService, config, logger } = deps;

  // Initialize allowlist and rate limiter with default configurations
  const allowlist = new EmulationAllowlist(createDefaultAllowlistConfig(), logger);
  const rateLimiter = new EmulationRateLimiter(createDefaultRateLimiterConfig(), logger);

  return {
    id: 'security.detection-emulation.run-command',
    type: ToolType.builtin,
    description: `Run a detection emulation command on endpoints through any supported EDR agent type.

This tool executes response actions for emulation scenarios, supporting:
- Elastic Defend (endpoint)
- Sentinel One (sentinel_one)
- CrowdStrike (crowdstrike)
- Microsoft Defender for Endpoint (microsoft_defender_endpoint)

The tool validates user privileges, checks host allowlists, enforces rate limits, and dispatches
commands through the appropriate EDR connector via ResponseActionsClient.

**Security Guardrails:**
- Feature flag check: Real execution must be enabled
- Per-command RBAC: User must have required privilege for the command
- Host allowlist: Target endpoints must be on the allowlist
- Rate limiting: Commands are throttled per space

**Example commands:**
- execute: Run a shell command or executable
- runscript: Execute a script file
- kill-process: Terminate a process by PID or name
- suspend-process: Suspend a process by PID or name
- scan: Trigger a malware scan
- get-file: Retrieve a file from the endpoint
- memory-dump: Capture process or kernel memory

Use this tool when validating detection rules through Real Execution mode, after the user
has explicitly authorized the emulation and all required permissions are in place.`,
    schema: runEmulationCommandSchema,
    handler: async (rawParams, { esClient, spaceId, request }) => {
      const { emulationId, command, endpointIds } = rawParams;

      try {
        // Re-validate against the strict discriminated union — the boundary
        // schema accepts a free-form `parameters` record so JSON Schema works
        // for the LLM, but the runner needs the exact per-command shape.
        const strictParseResult = RunEmulationCommandInputSchema.safeParse(rawParams);
        if (!strictParseResult.success) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] rejected: invalid parameters for command (${strictParseResult.error.message})`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'invalid_parameters',
                  message: 'Invalid parameters for the requested command.',
                  emulation_id: emulationId,
                  agent_type: rawParams.agentType,
                  command,
                  status_code: 400,
                  likely_cause:
                    'The provided `parameters` do not match the expected shape for this command (see skill content for required fields).',
                },
              },
            ],
          };
        }
        const params = strictParseResult.data;

        const featureFlags = getDetectionEmulationFeatureFlags(config.experimentalFeatures);

        // Gate 1: Feature flag check (wholesale enable/disable)
        if (!isRealExecutionEnabled(featureFlags)) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] blocked: real execution is disabled`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'feature_disabled',
                  message: 'Detection emulation real execution is disabled',
                  emulation_id: emulationId,
                  agent_type: params.agentType,
                  command,
                  status_code: 403,
                  likely_cause: 'Feature flag is disabled for real execution',
                },
              },
            ],
          };
        }

        // Gate 2: Per-command RBAC check.
        // The RBAC map does not cover every console command (e.g. `cancel` has
        // no dedicated privilege today); we treat a missing entry as "no extra
        // privilege required" rather than as a hard error. The endpoint authz
        // record uses well-known string keys so we narrow with a typed cast at
        // the boundary.
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
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    error_type: 'authorization_error',
                    message: `Insufficient privileges: command [${command}] requires [${requiredRbacFeature}]`,
                    emulation_id: emulationId,
                    agent_type: params.agentType,
                    command,
                    status_code: 403,
                    likely_cause: `User lacks required RBAC privilege [${requiredRbacFeature}]`,
                  },
                },
              ],
            };
          }

          logger.debug(
            `RBAC check passed for command [${command}]: user has privilege [${requiredRbacFeature}]`
          );
        }

        // Gate 3: Host allowlist validation
        const allowlistResult = allowlist.validate(endpointIds);
        if (!allowlistResult.allowed) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] blocked by allowlist: ${allowlistResult.error}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'authorization_error',
                  message: allowlistResult.error ?? 'Endpoints not in allowlist',
                  blocked_endpoints: allowlistResult.blockedEndpoints,
                  emulation_id: emulationId,
                  agent_type: params.agentType,
                  command,
                  status_code: 403,
                  likely_cause: 'One or more endpoints not in allowlist',
                },
              },
            ],
          };
        }

        // Gate 4: atomic rate-limit acquire (combines old check+record so concurrent
        // calls cannot all sneak past the gate before any of them records).
        const acquireResult = rateLimiter.acquire(spaceId, emulationId, command);
        if (!acquireResult.allowed) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${acquireResult.error}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'rate_limit_error',
                  message: acquireResult.error ?? 'Rate limit exceeded',
                  current_count: acquireResult.currentCount,
                  max_commands: acquireResult.maxCommands,
                  reset_ms: acquireResult.resetMs,
                  emulation_id: emulationId,
                  agent_type: params.agentType,
                  command,
                  status_code: 429,
                  likely_cause: 'Rate limit exceeded for this space',
                },
              },
            ],
          };
        }

        // Get start services for cases client and username. N5: refuse to dispatch a
        // destructive action without an authenticated caller — release the rate-limit
        // slot we just acquired and return 401 in this branch as well.
        //
        // Cases is acquired through `endpointService.getCasesClient` rather than
        // direct plugin access — security_solution's core start dependencies
        // do not register the cases plugin. We swallow lookup failures because
        // the cases client is optional for emulation dispatch.
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
          rateLimiter.release(acquireResult.token);
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] blocked: no authenticated user`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'authorization_error',
                  message: 'Authentication is required to run an emulation command.',
                  emulation_id: emulationId,
                  agent_type: params.agentType,
                  command,
                  status_code: 401,
                  likely_cause: 'No current user attached to the request.',
                },
              },
            ],
          };
        }

        // All gates passed — execute the command via EmulationRunner.
        //
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
        });

        const result = await runner.run(params);

        if (result.status === 'error') {
          // Roll the rate-limit acquire back so retries are not penalised.
          rateLimiter.release(acquireResult.token);
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'execution_error',
                  message: 'Failed to dispatch the emulation command.',
                  action_id: result.actionId,
                  emulation_id: emulationId,
                  agent_type: params.agentType,
                  command,
                  status_code: 502,
                  likely_cause: 'Internal error during command execution',
                },
              },
            ],
          };
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
        const error = err as Error;
        // We catch errors from anywhere in the handler, including before the
        // strict-parse branch sets `params`. Use `rawParams` for the user-
        // facing fields below so we always have a value to render.
        const agentType = rawParams.agentType;
        // Map typed runner errors → caller-facing classifications. We never echo
        // raw error messages back to the LLM in the unknown case; that's
        // logged server-side only (matches I3 in the REST route).
        if (error instanceof UnsupportedAgentTypeError) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] rejected: ${error.message}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'unsupported_agent_type',
                  message: error.message,
                  emulation_id: emulationId,
                  agent_type: agentType,
                  command,
                  status_code: 400,
                  likely_cause: 'Selected agent type is not supported by this build.',
                },
              },
            ],
          };
        }

        if (error instanceof UnsupportedCommandForAgentTypeError) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] rejected: ${error.message}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'unsupported_command_for_agent_type',
                  message: error.message,
                  emulation_id: emulationId,
                  agent_type: agentType,
                  command,
                  status_code: 400,
                  likely_cause: 'This command is not supported for the selected agent type.',
                },
              },
            ],
          };
        }

        if (error instanceof MissingConnectorActionsError) {
          logger.error(
            `Emulation command [${command}] for emulation [${emulationId}] failed: ${error.message}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'missing_connector_actions',
                  message:
                    'Missing connector configuration required to dispatch this command. Please contact an administrator.',
                  emulation_id: emulationId,
                  agent_type: agentType,
                  command,
                  status_code: 500,
                  likely_cause: 'Server-side wiring is incomplete for this agent type.',
                },
              },
            ],
          };
        }

        // logger.error's second arg must be a `LogMeta`-shaped record; pass
        // the structured tag bag rather than the raw Error.
        logger.error(
          `Failed to execute emulation command [${command}] for emulation [${emulationId}]: ${error.message}`,
          { tags: ['detection-emulation'], stack: error.stack } as Record<string, unknown>
        );

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                error_type: 'execution_error',
                // Generic, sanitized message — internal details are server-side only.
                message: 'Failed to execute the emulation command.',
                emulation_id: emulationId,
                agent_type: agentType,
                command,
                status_code: 500,
                likely_cause: 'Internal error during command execution',
              },
            },
          ],
        };
      }
    },
  };
};
