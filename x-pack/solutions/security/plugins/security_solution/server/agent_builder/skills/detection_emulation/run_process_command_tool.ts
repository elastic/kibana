/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { RunEmulationCommandInputSchema } from '../../../../common/detection_emulation/schemas/run_emulation_command_input';
import { MAX_ENDPOINT_FANOUT } from '../../../../common/detection_emulation/schemas/constants';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { DetectionEmulationGuardrails } from '../../../lib/detection_emulation/execution/shared_guardrails';
import { buildAgentBuilderActor } from '../../../lib/detection_emulation/execution/audit_context';
import { withCommandGates } from './with_command_gates';
import { buildEmulationConfirmation } from './build_emulation_confirmation';
import { toolError } from './emulation_tool_errors';

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
  emulationId: z.string().min(1).describe('Unique identifier for the emulation run.'),
  agentType: z
    .enum(['endpoint'])
    .default('endpoint')
    .describe(
      'EDR agent type. Currently only `endpoint` (Elastic Defend) is wired. Omit; defaults to `endpoint`.'
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
  command: z.enum(PROCESS_FAMILY_COMMANDS).describe(
    `Process-family command:
- \`kill-process\` — terminate by \`{ pid: number }\` *or* \`{ entity_id: string }\`
- \`suspend-process\` — pause by \`{ pid: number }\` *or* \`{ entity_id: string }\`
- \`running-processes\` — list (no required parameters)
- \`memory-dump\` — \`{ type: 'kernel' }\` *or* \`{ type: 'process', pid: number }\` *or* \`{ type: 'process', entity_id: string }\`

Every command in this family ALSO accepts an optional \`comment: string\` in \`parameters\` — recorded against the response-action audit trail. Use it when running on behalf of a human operator (e.g. \`{ comment: 'sweep for rogue PowerShell' }\`).`
  ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Command-specific parameters (strictly validated server-side per command). See `command` description for the required shape. Every command additionally accepts an optional `{ comment: string }` attached to the response-action audit trail.'
    ),
});

export interface RunProcessCommandToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
  /**
   * Shared guardrails (allowlist + rate limiter) constructed once in
   * `plugin.ts` and threaded through. See `shared_guardrails.ts` for
   * why these MUST be shared across all dispatch surfaces rather than
   * built per-factory.
   */
  guardrails: DetectionEmulationGuardrails;
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
  const { core, endpointService, config, logger, guardrails } = deps;
  const { allowlist, rateLimiter } = guardrails;

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
for processes on a target endpoint.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. If the user declines, do NOT
retry the same operation; surface the cancellation and continue with
unrelated work.`,
    schema: runProcessCommandSchema,
    // HITL: declarative confirmation — framework prompts the user once
    // per conversation before the first invocation. Replaces the older
    // prose-only "Confirm the user understands the risks" guidance in
    // the skill body, which the LLM could legitimately ignore.
    confirmation: {
      askUser: 'once',
      getConfirmation: ({ toolParams }) =>
        buildEmulationConfirmation({
          family: 'process',
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
        return toolError.invalidParameters({
          emulation_id: emulationId,
          agent_type: agentType,
          command,
        });
      }

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
