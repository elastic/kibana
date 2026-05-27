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
import { createTracedLogger } from '../../../lib/detection_emulation/execution/traced_logger';
import { withCommandGates } from './with_command_gates';
import { buildEmulationConfirmation } from './build_emulation_confirmation';
import { toolError } from './emulation_tool_errors';

export interface FamilyToolConfig {
  family: 'process' | 'file' | 'network' | 'execution';
  id: string;
  commands: readonly [string, ...string[]];
  description: string;
  commandFieldDescription: string;
}

export interface RunFamilyCommandToolDeps {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
  guardrails: DetectionEmulationGuardrails;
}

export function createRunFamilyCommandTool(
  familyConfig: FamilyToolConfig,
  deps: RunFamilyCommandToolDeps
): BuiltinSkillBoundedTool<any> {
  const { family, id, commands, description, commandFieldDescription } = familyConfig;
  const { core, endpointService, config, logger, guardrails } = deps;
  const { allowlist, rateLimiter, idempotencyCache } = guardrails;

  const schema = z.object({
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
    command: z.enum(commands as any).describe(commandFieldDescription),
    parameters: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'Command-specific parameters (strictly validated server-side per command). See `command` description for the required shape. Every command additionally accepts an optional `{ comment: string }` attached to the response-action audit trail.'
      ),
  });

  return {
    id,
    type: ToolType.builtin,
    description,
    schema,
    confirmation: {
      askUser: 'once' as const,
      getConfirmation: ({ toolParams }: { toolParams: z.infer<typeof schema> }) =>
        buildEmulationConfirmation({
          family,
          emulationId: toolParams.emulationId,
          command: toolParams.command,
          endpointIds: toolParams.endpointIds,
          parameters: toolParams.parameters,
        }),
    },
    handler: async (
      rawParams: z.infer<typeof schema>,
      { esClient, spaceId, request, runContext, callContext, savedObjectsClient }: any
    ) => {
      const { emulationId, agentType, command } = rawParams;

      const log = createTracedLogger(logger, {
        tool: `run-${family}-command`,
        entityId: emulationId,
      });

      const strictParseResult = RunEmulationCommandInputSchema.safeParse(rawParams);
      if (!strictParseResult.success) {
        log.warn(
          `Command [${command}] rejected: invalid parameters (${strictParseResult.error.message})`
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
          logger: log,
          allowlist,
          rateLimiter,
          idempotencyCache,
          request,
          esClient,
          spaceId,
          savedObjectsClient,
          actorContext,
        },
        strictParseResult.data
      );
    },
  };
}
