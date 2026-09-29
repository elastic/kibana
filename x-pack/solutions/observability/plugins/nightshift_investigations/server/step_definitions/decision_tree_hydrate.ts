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
import { hydrateDecisionTreeWorkspace } from '../decision_trees/register_decision_trees';
import { unscopeConversationId } from '../tools/sandbox_bash/tool_utils';
import { withTimeout } from './with_timeout';

/** Caps beforeAgent so a stuck sandbox write cannot stall the reinforcement round. */
const HYDRATE_TIMEOUT_MS = 20_000;

export const decisionTreeHydrateStepDefinition = ({
  getSandboxStart,
  logger,
  isEnabled,
}: {
  getSandboxStart: () => SandboxPluginStart | undefined;
  logger: Logger;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.decisionTreeHydrate',
    label: 'Hydrate Decision Trees into Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes the stored decision trees into /workspace/decision-trees for the sandbox obtained ' +
      'earlier in this workflow. Does not allocate; writes to the sandbox_id it is given so every ' +
      'writer addresses the same workspace.',
    inputSchema: z.object({
      sandbox_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Workspace key from nightshift.obtainSandbox. Already space-scoped.'),
      prompt: z
        .string()
        .max(500_000)
        .optional()
        .describe(
          'The round message. Reinforcement messages carry an accessed-trees marker; without it every tree is written (investigator hydrate).'
        ),
    }),
    outputSchema: z.object({
      sandbox_id: z.string().describe('Sandbox that was hydrated.'),
      conversation_id: z
        .string()
        .describe('Unscoped conversation id derived from the sandbox key.'),
      tree_count: z.number().describe('Number of decision trees written into the sandbox.'),
      skipped: z.boolean().optional(),
    }),
    handler: async (context) => {
      const { sandbox_id: sandboxId, prompt } = context.input;
      const { spaceId } = context.contextManager.getContext().workflow;
      const conversationId = unscopeConversationId(spaceId, sandboxId);

      // The combined materialize workflow installs with Cortex or Memory, so this step is
      // registered even when the tree feature is off. Fail closed without touching the sandbox.
      if (isEnabled && !isEnabled()) {
        context.logger.info(`Skipped decision tree hydrate for sandbox ${sandboxId} (flag off)`);
        return {
          output: {
            sandbox_id: sandboxId,
            conversation_id: conversationId,
            tree_count: 0,
            skipped: true,
          },
        };
      }

      const sandboxStart = getSandboxStart();

      if (!sandboxStart) {
        throw new Error(
          'The sandbox is not configured — ' +
            'ensure the sandbox plugin is installed and configured.'
        );
      }

      // getSessionForSpace scopes internally, so the space-scoped sandbox_id must be unscoped first.
      // This resolves the same session obtain_sandbox already allocated for this conversation.
      const session = sandboxStart.getSessionForSpace(spaceId, conversationId);

      context.logger.info(`Hydrating decision trees into sandbox ${sandboxId} (space ${spaceId})`);

      const treeCount = await withTimeout(
        (signal) =>
          hydrateDecisionTreeWorkspace({
            session,
            esClient: context.contextManager.getScopedEsClient(),
            logger,
            spaceId,
            prompt,
            signal,
          }),
        HYDRATE_TIMEOUT_MS,
        `Decision tree hydrate timed out after ${HYDRATE_TIMEOUT_MS}ms`
      );

      return {
        output: { sandbox_id: sandboxId, conversation_id: conversationId, tree_count: treeCount },
      };
    },
  });
