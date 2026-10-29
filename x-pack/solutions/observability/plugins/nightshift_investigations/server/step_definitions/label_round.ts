/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { KibanaRequest } from '@kbn/core/server';
import { usesDecisionTrees } from '../agents/agent_policy';
import { INVESTIGATION_ROUND_KINDS, type InvestigationRoundKind } from '../client/round_kind';

/**
 * Reads which kind of round is starting, so the post-round workflow can tell a first round from
 * a follow-up. It reads it here, before the round, because the post-round workflow starts after
 * the round in the background: by then the run that started the round may have finished, and
 * would read as no run at all.
 */
export const labelRoundStepDefinition = ({
  getRoundKind,
  isEnabled,
}: {
  /** The kind of round the investigation's current run declared. Throws when it cannot tell. */
  getRoundKind: (
    request: KibanaRequest,
    investigationId: string
  ) => Promise<InvestigationRoundKind>;
  isEnabled?: () => boolean;
}) =>
  createServerStepDefinition({
    id: 'nightshift.labelRound',
    label: 'Label Nightshift Investigation Round',
    category: StepCategory.Ai,
    description:
      'Reads the kind of investigation round that is starting (first round, follow-up, or alert ' +
      'recovery) from the run that started it. Outputs nothing when it cannot tell.',
    inputSchema: z.object({
      conversation_id: z
        .string()
        .max(512)
        .optional()
        .describe('The investigation (conversation) the round belongs to.'),
      agent_id: z
        .string()
        .max(1024)
        .optional()
        .describe('Agent id for this round. Rounds of other agents are not labelled.'),
    }),
    outputSchema: z.object({
      round_kind: z.enum(INVESTIGATION_ROUND_KINDS).optional(),
    }),
    handler: async (context) => {
      const { conversation_id: conversationId, agent_id: agentId } = context.input;
      // Only decision-tree reinforcement reads the label.
      if ((isEnabled && !isEnabled()) || !usesDecisionTrees(agentId) || !conversationId) {
        return { output: {} };
      }
      // A failed before-agent workflow aborts the round. Without a label the post-round
      // reinforcement fails instead, which leaves the investigation running.
      try {
        const roundKind = await getRoundKind(
          context.contextManager.getFakeRequest(),
          conversationId
        );
        return { output: { round_kind: roundKind } };
      } catch (error) {
        context.logger.warn(
          `Could not tell which kind of round of "${conversationId}" is starting: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { output: {} };
      }
    },
  });
