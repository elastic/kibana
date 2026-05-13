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
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../common/endpoint/service/response_actions/constants';
import { RunEmulationCommandInputSchema } from '../../../../common/detection_emulation/schemas/run_emulation_command_input';
import { MAX_ENDPOINT_FANOUT } from '../../../../common/detection_emulation/schemas/constants';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  EmulationAllowlist,
  createAllowlistFromConfig,
} from '../../../lib/detection_emulation/execution/allowlist';
import {
  EmulationRateLimiter,
  createDefaultRateLimiterConfig,
} from '../../../lib/detection_emulation/execution/rate_limiter';
import { buildAgentBuilderActor } from '../../../lib/detection_emulation/execution/audit_context';
import { withCommandGates } from './with_command_gates';
import { buildEmulationConfirmation } from './build_emulation_confirmation';

const EXECUTION_FAMILY_COMMANDS = ['execute', 'runscript', 'cancel'] as const;

/**
 * Tool boundary schema for the execution-family commands. See the
 * process-family tool docstring for why the boundary keeps
 * `parameters` opaque and the handler re-parses with the strict
 * discriminated union.
 */
const runExecutionCommandSchema = z.object({
  emulationId: z.string().min(1).describe('Unique identifier for the emulation run.'),
  agentType: z
    .enum(RESPONSE_ACTION_AGENT_TYPE)
    .describe(
      'EDR agent type. Only `endpoint` is wired through the route today; selecting another type returns 400 until external connectors are resolved.'
    ),
  endpointIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_ENDPOINT_FANOUT, {
      message: `endpointIds must contain at most ${MAX_ENDPOINT_FANOUT} entries (MAX_ENDPOINT_FANOUT)`,
    })
    .describe(
      `Endpoint agent IDs to dispatch the action against (1–${MAX_ENDPOINT_FANOUT}). The fanout cap exists so a single call cannot N-multiply the per-host EDR rate budget by accident; if a user asks to dispatch against more than ${MAX_ENDPOINT_FANOUT} endpoints, split the request into sequential calls.`
    ),
  command: z.enum(EXECUTION_FAMILY_COMMANDS).describe(
    `Execution-family command (HIGHEST IMPACT — runs arbitrary code on the endpoint):
- \`execute\` — \`{ command: string, timeout?: number }\` — run a shell command/executable
- \`runscript\` — \`{ scriptId: string, scriptInput?: string, timeout?: number }\` — run a script-library entry
- \`cancel\` — \`{ id: string }\` — cancel a previously-dispatched response action by id

Every command in this family ALSO accepts an optional \`comment: string\` in \`parameters\` — recorded against the response-action audit trail. Strongly recommended for \`execute\` and \`runscript\` so an auditor can see *why* the code ran (e.g. \`{ command: 'whoami', comment: 'verify hostname for rule X validation' }\`).`
  ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Command-specific parameters (strictly validated server-side per command). See `command` description for the required shape. Every command additionally accepts an optional `{ comment: string }` attached to the response-action audit trail.'
    ),
});

export interface RunExecutionCommandToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

/**
 * Execution-family runEmulationCommand tool. Covers `execute`,
 * `runscript`, and `cancel`. Shares the gate sequence with the other
 * three per-family tools via {@link withCommandGates}.
 */
export const createRunExecutionCommandTool = (
  deps: RunExecutionCommandToolDeps
): BuiltinSkillBoundedTool<typeof runExecutionCommandSchema> => {
  const { core, endpointService, config, logger } = deps;

  // PROD-1: default-deny when no operator allowlist is supplied, with a
  // registration-time warning so operators see immediately that
  // real_execution is locked out until the allowlist is configured.
  const operatorAllowlist = config.detectionEmulation?.allowlist;
  if (!operatorAllowlist) {
    logger.warn(
      '[detection-emulation] runExecutionCommand tool registered with NO operator allowlist (`xpack.securitySolution.detectionEmulation.allowlist`); default-deny is in effect — every call will be blocked until the allowlist is configured.'
    );
  }
  const allowlist = new EmulationAllowlist(createAllowlistFromConfig(operatorAllowlist), logger);
  const rateLimiter = new EmulationRateLimiter(createDefaultRateLimiterConfig(), logger);

  return {
    id: 'security.detection-emulation.run-execution-command',
    type: ToolType.builtin,
    description: `Run an *execution-family* response action against one or more endpoints.

Covers: \`execute\`, \`runscript\`, \`cancel\`.

This is the highest-impact family — \`execute\` and \`runscript\` run arbitrary code on
the target endpoint. The schema validates strictly on the server side so wrong
types or extra keys fail fast before reaching the EDR connector.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check (\`execute\`/\`runscript\` require elevated privilege)
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to run a shell command, run a script-library entry,
or cancel a previously-dispatched response action.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. \`execute\` and \`runscript\` render
a destructive (red) confirm button; \`cancel\` is treated as recoverable. If
the user declines, do NOT retry; surface the cancellation and continue with
unrelated work.`,
    schema: runExecutionCommandSchema,
    confirmation: {
      askUser: 'once',
      getConfirmation: ({ toolParams }) =>
        buildEmulationConfirmation({
          family: 'execution',
          emulationId: toolParams.emulationId,
          command: toolParams.command,
          endpointIds: toolParams.endpointIds,
          parameters: toolParams.parameters,
        }),
    },
    handler: async (rawParams, { esClient, spaceId, request, runContext, callContext }) => {
      const { emulationId, agentType, command } = rawParams;

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
                agent_type: agentType,
                command,
                status_code: 400,
                likely_cause:
                  'The provided `parameters` do not match the expected shape for this command (see schema description for the required fields).',
              },
            },
          ],
        };
      }

      // PROD-2: capture agent-builder attribution for the dispatched
      // response action's audit comment.
      const actorContext = buildAgentBuilderActor(runContext, callContext.toolCallId);

      return withCommandGates(
        {
          core,
          endpointService,
          config,
          logger,
          allowlist,
          rateLimiter,
          request,
          esClient,
          spaceId,
          actorContext,
        },
        strictParseResult.data
      );
    },
  };
};
