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
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import {
  EmulationAllowlist,
  createDefaultAllowlistConfig,
} from '../../../lib/detection_emulation/execution/allowlist';
import {
  EmulationRateLimiter,
  createDefaultRateLimiterConfig,
} from '../../../lib/detection_emulation/execution/rate_limiter';
import { withCommandGates } from './with_command_gates';

/**
 * Process-family commands. Restricting the boundary `command` enum to
 * just these literals stops the LLM from selecting (e.g.) `isolate`
 * through this tool — that's a different family with a different gate
 * sequence and a different parameter shape.
 */
const PROCESS_FAMILY_COMMANDS = [
  'kill-process',
  'suspend-process',
  'running-processes',
  'memory-dump',
] as const;

/**
 * Tool boundary schema for the process-family commands.
 *
 * The agent-builder framework requires a `ZodObject` at the boundary
 * (it derives the JSON Schema for the LLM from `.shape`), so we keep
 * the boundary permissive: `command` is narrowed to this family's
 * literals, and `parameters` is an opaque record. Inside the handler
 * we re-parse with the central {@link RunEmulationCommandInputSchema}
 * discriminated union, which fails fast on misspelled fields, extra
 * keys, or wrong types — same strictness as a discriminated-union
 * boundary, just enforced one step downstream.
 */
const runProcessCommandSchema = z.object({
  emulationId: z
    .string()
    .min(1)
    .describe('Unique identifier for the emulation run.'),
  agentType: z
    .enum(RESPONSE_ACTION_AGENT_TYPE)
    .describe(
      'EDR agent type. Only `endpoint` is wired through the route today; selecting another type returns 400 until external connectors are resolved.'
    ),
  endpointIds: z
    .array(z.string().min(1))
    .min(1)
    .describe('Endpoint agent IDs to dispatch the action against (1+).'),
  command: z
    .enum(PROCESS_FAMILY_COMMANDS)
    .describe(
      `Process-family command:
- \`kill-process\` — terminate by \`{ pid: number }\` *or* \`{ entity_id: string }\`
- \`suspend-process\` — pause by \`{ pid: number }\` *or* \`{ entity_id: string }\`
- \`running-processes\` — list with no required parameters
- \`memory-dump\` — \`{ type: 'kernel' }\` *or* \`{ type: 'process', pid: number }\` *or* \`{ type: 'process', entity_id: string }\``
    ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Command-specific parameters (strictly validated server-side per command). See `command` description for the required shape.'
    ),
});

export interface RunProcessCommandToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

/**
 * Process-family runEmulationCommand tool. Covers `kill-process`,
 * `suspend-process`, `running-processes`, and `memory-dump`. Shares
 * the gate sequence with the other three per-family tools via
 * {@link withCommandGates}.
 */
export const createRunProcessCommandTool = (
  deps: RunProcessCommandToolDeps
): BuiltinSkillBoundedTool<typeof runProcessCommandSchema> => {
  const { core, endpointService, config, logger } = deps;

  const allowlist = new EmulationAllowlist(createDefaultAllowlistConfig(), logger);
  const rateLimiter = new EmulationRateLimiter(createDefaultRateLimiterConfig(), logger);

  return {
    id: 'security.detection-emulation.run-process-command',
    type: ToolType.builtin,
    description: `Run a *process-family* response action against one or more endpoints.

Covers: \`kill-process\`, \`suspend-process\`, \`running-processes\`, \`memory-dump\`.

Each command has a *typed* parameter shape — the schema validates strictly on the
server side so misspelled fields (\`entityId\` instead of \`entity_id\`, extra keys,
wrong types) fail fast before reaching the EDR connector.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to enumerate, terminate, suspend, or dump memory
for processes on a target endpoint.`,
    schema: runProcessCommandSchema,
    handler: async (rawParams, { esClient, spaceId, request }) => {
      const { emulationId, agentType, command } = rawParams;

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
        },
        strictParseResult.data
      );
    },
  };
};
