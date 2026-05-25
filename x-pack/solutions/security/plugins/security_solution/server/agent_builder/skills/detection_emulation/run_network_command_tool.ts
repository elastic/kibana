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

const NETWORK_FAMILY_COMMANDS = ['isolate', 'unisolate'] as const;

/**
 * Tool boundary schema for the network-family commands. See the
 * process-family tool docstring for why the boundary keeps
 * `parameters` opaque and the handler re-parses with the strict
 * discriminated union.
 */
const runNetworkCommandSchema = z.object({
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
  command: z.enum(NETWORK_FAMILY_COMMANDS).describe(
    `Network-family command:
- \`isolate\` — block inbound/outbound traffic on the endpoint(s) (Elastic Defend management connection still allowed)
- \`unisolate\` — release the endpoint(s) from network isolation
Both accept only an optional \`{ comment: string }\` recorded against the response action.`
  ),
  parameters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional parameters. Only `{ comment?: string }` is supported for this family.'),
});

export interface RunNetworkCommandToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
  /** See `RunProcessCommandToolDeps.guardrails`. */
  guardrails: DetectionEmulationGuardrails;
}

/**
 * Network-family runEmulationCommand tool. Covers `isolate` and
 * `unisolate`. Shares the gate sequence with the other three
 * per-family tools via {@link withCommandGates}.
 */
export const createRunNetworkCommandTool = (
  deps: RunNetworkCommandToolDeps
): BuiltinSkillBoundedTool<typeof runNetworkCommandSchema> => {
  const { core, endpointService, config, logger, guardrails } = deps;
  const { allowlist, rateLimiter } = guardrails;

  return {
    id: 'security.detection-emulation.run-network-command',
    type: ToolType.builtin,
    description: `Run a *network-family* response action against one or more endpoints.

Covers: \`isolate\`, \`unisolate\`.

These are containment commands — they take only an optional \`comment\` and act on
the endpoint as a whole. \`isolate\` blocks inbound/outbound traffic (except Elastic
Defend management); \`unisolate\` restores normal traffic flow.

**Security gates** (in order; first failure short-circuits):
1. Real-execution feature flag must be enabled
2. Per-command RBAC privilege check
3. Host allowlist
4. Per-space rate limit (atomic acquire)
5. Authenticated caller required

Use this tool when the user wants to network-isolate (or release) one or more
endpoints during incident response or attack containment emulation.

**Confirmation:** the agent-builder framework prompts the user once per
conversation before the first invocation. If the user declines, do NOT
retry the same operation; surface the cancellation and continue with
unrelated work.`,
    schema: runNetworkCommandSchema,
    confirmation: {
      askUser: 'once',
      getConfirmation: ({ toolParams }) =>
        buildEmulationConfirmation({
          family: 'network',
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
