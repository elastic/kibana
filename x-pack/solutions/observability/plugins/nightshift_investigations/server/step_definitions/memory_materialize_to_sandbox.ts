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
import { hydrateMemoryWorkspace } from '../memory/register_memory';
import { unscopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

/** Caps a stuck write so it cannot stall the rest of the parallel hydrate. */
const MATERIALIZE_TIMEOUT_MS = 45_000;

export const memoryMaterializeToSandboxStepDefinition = ({
  getSandboxStart,
  logger,
  isEnabled,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.memoryMaterializeToSandbox',
    label: 'Materialize Nightshift Semantic Memory to Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes ranked Semantic Memory pages into /workspace/memories for the sandbox obtained ' +
      'earlier in this workflow. Does not allocate; uses sandbox_id as-is.',
    inputSchema: z.object({
      sandbox_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Workspace key from nightshift.obtainSandbox. Already space-scoped.'),
      prompt: z
        .string()
        .max(65_536)
        .optional()
        .describe('The user message for this round, used as a memory search query when present.'),
    }),
    outputSchema: z.object({
      sandbox_id: z.string().describe('Sandbox that received the memory pages.'),
      skipped: z.boolean().optional(),
    }),
    handler: async (context) => {
      const { sandbox_id: sandboxId, prompt } = context.input;
      const { spaceId } = context.contextManager.getContext().workflow;

      if (isEnabled && !isEnabled()) {
        return { output: { sandbox_id: sandboxId, skipped: true } };
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

      await withTimeout(
        (signal) =>
          hydrateMemoryWorkspace({
            session,
            esClient: context.contextManager.getScopedEsClient(),
            spaceId,
            query: prompt,
            signal,
            logger,
          }),
        MATERIALIZE_TIMEOUT_MS,
        `Memory materialize to sandbox timed out after ${MATERIALIZE_TIMEOUT_MS}ms`
      );

      return { output: { sandbox_id: sandboxId } };
    },
  });
