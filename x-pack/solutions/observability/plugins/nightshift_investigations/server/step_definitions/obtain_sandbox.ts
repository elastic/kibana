/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import type { SandboxPluginStart } from '@kbn/sandbox-plugin/server';
import { scopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { teeWorkflowLogger } from '../lib/tee_workflow_logger';
import { withTimeout } from './with_timeout';

/** Caps a stuck sandbox allocate so it cannot stall hydrate or optimize. */
const ALLOCATE_TIMEOUT_MS = 45_000;

/**
 * Forces the sandbox plugin to allocate (or reuse) the conversation's session.
 *
 * Hydrate and optimize writers must not do this themselves: each first RPC on a
 * cold session can restore workspace state. Obtain once, then pass `sandbox_id`.
 *
 * The id is `<space>__<conversation>` — the same key the sandbox plugin uses as
 * the gRPC conversation id. Agent Builder does not thread hydrate output into
 * tools or afterExecution; every stage recomputes this function.
 *
 * Uses getSessionForSpace so Kibana-side connector-manifest init still runs on
 * the first agent tool call.
 */
export const obtainSandboxStepDefinition = ({
  getSandboxStart,
  logger,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'nightshift.obtainSandbox',
    label: 'Obtain Nightshift Sandbox',
    category: StepCategory.Ai,
    description:
      'Allocates the conversation sandbox and returns the space-scoped sandbox_id ' +
      'that hydrate, agent tools, and optimize must share.',
    inputSchema: z.object({
      conversation_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Unscoped conversation id from the Agent Builder hook.'),
      required: z
        .boolean()
        .optional()
        .describe(
          'When false, a missing sandbox config skips allocate and still returns sandbox_id. ' +
            'Hydrate leaves this unset (fail closed). Optimize sets false so transcript ' +
            'extraction still runs.'
        ),
    }),
    outputSchema: z.object({
      sandbox_id: z
        .string()
        .describe('Workspace key (`<space>__<conversation>`). Pass this to every writer.'),
      conversation_id: z.string().describe('Unscoped conversation id from the hook.'),
      skipped: z.boolean().optional(),
    }),
    handler: async (context) => {
      const { conversation_id: conversationId, required = true } = context.input;
      const { spaceId } = context.contextManager.getContext().workflow;
      const sandboxId = scopeConversationId(spaceId, conversationId);
      const sandboxStart = getSandboxStart();
      const stepLogger = teeWorkflowLogger(logger, context.logger);

      if (!sandboxStart) {
        if (!required) {
          stepLogger.info(`Sandbox is not configured — skipping allocate for ${sandboxId}`);
          return {
            output: { sandbox_id: sandboxId, conversation_id: conversationId, skipped: true },
          };
        }
        throw new Error(
          'The sandbox is not configured — ' +
            'ensure the sandbox plugin is installed and configured.'
        );
      }

      try {
        const session = sandboxStart.getSessionForSpace(spaceId, conversationId);

        // Stat is enough: the session allocates on the first RPC, including workspace restore.
        await withTimeout(
          (_signal) => session.statFiles(['/workspace']),
          ALLOCATE_TIMEOUT_MS,
          `Sandbox allocate timed out after ${ALLOCATE_TIMEOUT_MS}ms`
        );
      } catch (error) {
        if (required) {
          throw error;
        }
        stepLogger.info(`Sandbox unavailable — skipping allocate for ${sandboxId}`);
        stepLogger.debug(
          `Optional sandbox allocation failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          output: { sandbox_id: sandboxId, conversation_id: conversationId, skipped: true },
        };
      }

      stepLogger.info(`Obtained sandbox ${sandboxId}`);
      return { output: { sandbox_id: sandboxId, conversation_id: conversationId } };
    },
  });
