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
import { hydrateCortexWorkspace } from '../cortex/register_cortex';
import { teeWorkflowLogger } from '../lib/tee_workflow_logger';
import { scopeConversationId, unscopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

/** Caps a stuck write so it cannot stall the rest of the parallel hydrate. */
const HYDRATE_TIMEOUT_MS = 45_000;

export const cortexHydrateStepDefinition = ({
  getSandboxStart,
  logger,
  isEnabled,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.cortexHydrate',
    label: 'Hydrate Nightshift Cortex into Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes the current Cortex wiki into /workspace/cortex for the sandbox obtained ' +
      'earlier in this workflow. Does not allocate; accepts its sandbox_id or a legacy conversation_id.',
    inputSchema: z
      .object({
        sandbox_id: z
          .string()
          .min(1)
          .max(1024)
          .optional()
          .describe('Workspace key from nightshift.obtainSandbox. Already space-scoped.'),
        conversation_id: z
          .string()
          .min(1)
          .max(1024)
          .optional()
          .describe('Legacy unscoped conversation id. Scoped using the workflow Space.'),
      })
      .refine(
        ({ sandbox_id: sandboxId, conversation_id: conversationId }) => {
          return sandboxId !== undefined || conversationId !== undefined;
        },
        { message: 'Either sandbox_id or conversation_id is required.' }
      ),
    outputSchema: z.object({
      sandbox_id: z.string().describe('Sandbox that was hydrated.'),
      skipped: z.boolean().optional(),
      notification: z
        .string()
        .describe(
          'Always empty. Cortex writes the full wiki every turn, so it does not list pages in the system update.'
        ),
    }),
    handler: async (context) => {
      const { sandbox_id: providedSandboxId, conversation_id: conversationId } = context.input;
      const { spaceId } = context.contextManager.getContext().workflow;
      const sandboxId =
        providedSandboxId ??
        (conversationId !== undefined ? scopeConversationId(spaceId, conversationId) : undefined);
      if (sandboxId === undefined) {
        throw new Error('Either sandbox_id or conversation_id is required.');
      }

      if (isEnabled && !isEnabled()) {
        context.logger.info(`Skipped Cortex hydrate for sandbox ${sandboxId} (flag off)`);
        return { output: { sandbox_id: sandboxId, skipped: true, notification: '' } };
      }

      const sandboxStart = getSandboxStart();

      if (!sandboxStart) {
        throw new Error(
          'The sandbox is not configured — ' +
            'ensure the sandbox plugin is installed and configured.'
        );
      }

      const session = sandboxStart.getSessionForSpace(
        spaceId,
        unscopeConversationId(spaceId, sandboxId)
      );

      context.logger.info(`Hydrating Cortex into sandbox ${sandboxId} (space ${spaceId})`);

      await withTimeout(
        (signal) =>
          hydrateCortexWorkspace({
            session,
            esClient: context.contextManager.getScopedEsClient(),
            spaceId,
            signal,
            logger: teeWorkflowLogger(logger, context.logger),
          }),
        HYDRATE_TIMEOUT_MS,
        `Cortex hydrate timed out after ${HYDRATE_TIMEOUT_MS}ms`
      );

      return { output: { sandbox_id: sandboxId, notification: '' } };
    },
  });
