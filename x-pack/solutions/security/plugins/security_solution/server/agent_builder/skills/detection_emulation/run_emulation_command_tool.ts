/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/core/server';
import {
  ToolType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { EmulationRunner } from '../../../lib/detection_emulation/execution/runner';
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
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

/**
 * Tool schema for running emulation commands with multi-EDR support.
 * Accepts any of the four supported EDR agent types and validates command.
 */
const runEmulationCommandSchema = z.object({
  emulationId: z.string().describe('Unique identifier for the emulation'),
  agentType: z
    .enum(RESPONSE_ACTION_AGENT_TYPE)
    .describe(
      'The EDR agent type - must be one of: endpoint, sentinel_one, crowdstrike, microsoft_defender_endpoint'
    ),
  endpointIds: z
    .array(z.string())
    .min(1)
    .describe('Array of endpoint agent IDs to target with the emulation command'),
  command: z
    .enum(RESPONSE_ACTION_API_COMMANDS_NAMES)
    .describe(
      'The response action command to execute - e.g., execute, runscript, kill-process, suspend-process, scan, get-file, memory-dump'
    ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional parameters specific to the command being executed'),
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
): BuiltinToolDefinition<typeof runEmulationCommandSchema> => {
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
    tags: ['security', 'emulation', 'response-actions'],
    schema: runEmulationCommandSchema,
    handler: async (params, { esClient, spaceId, request }) => {
      const { emulationId, command, endpointIds } = params;

      try {
        const featureFlags = getDetectionEmulationFeatureFlags(config);

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

        // Gate 2: Per-command RBAC check
        const consoleCommand = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command];
        const requiredRbacFeature =
          RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL[consoleCommand];

        if (requiredRbacFeature) {
          const endpointAuthz = await endpointService.getEndpointAuthz(request);
          const hasPrivilege = endpointAuthz[requiredRbacFeature];

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

        // Gate 4: Rate limit check
        const rateLimitResult = rateLimiter.check(spaceId);
        if (!rateLimitResult.allowed) {
          logger.warn(
            `Emulation command [${command}] for emulation [${emulationId}] blocked by rate limiter: ${rateLimitResult.error}`
          );
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'rate_limit_error',
                  message: rateLimitResult.error ?? 'Rate limit exceeded',
                  current_count: rateLimitResult.currentCount,
                  max_commands: rateLimitResult.maxCommands,
                  reset_ms: rateLimitResult.resetMs,
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

        // Get start services for cases client and username
        const [coreStart] = await core.getStartServices();
        const casesClient = coreStart.plugins.cases
          ? await coreStart.plugins.cases.getClient(request)
          : undefined;
        const username =
          (await coreStart.security?.authc.getCurrentUser(request))?.username ?? 'unknown';

        // All gates passed - execute the command via EmulationRunner
        const runner = new EmulationRunner({
          endpointService,
          esClient: esClient.asCurrentUser,
          spaceId,
          casesClient,
          username,
          logger,
        });

        const result = await runner.run(params);

        if (result.status === 'error') {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  error_type: 'execution_error',
                  message: result.error ?? 'Unknown error executing emulation command',
                  action_id: result.actionId,
                  emulation_id: emulationId,
                  agent_type: params.agentType,
                  command,
                  status_code: 500,
                  likely_cause: 'Internal error during command execution',
                },
              },
            ],
          };
        }

        // Record successful execution in rate limiter
        rateLimiter.record(spaceId, emulationId, command);

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
        const errorMessage = error.message ?? 'Unknown error';

        logger.error(`Failed to execute emulation command: ${errorMessage}`, error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                error_type: 'execution_error',
                message: `Failed to execute emulation command: ${errorMessage}`,
                emulation_id: emulationId,
                agent_type: params.agentType,
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
