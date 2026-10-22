/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  HookExecutionMode,
  HookLifecycle,
  type AgentBuilderPluginSetup,
} from '@kbn/agent-builder-server';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { FindingsCoordinator } from './coordinator';
import {
  FINDINGS_RECORDER_AFTER_EXECUTION_HOOK_ID,
  FINDINGS_RECORDER_CYCLE_HOOK_ID,
  FINDINGS_RECORDER_EVERY_CYCLES,
  FINDINGS_RECORDER_FINAL_TIMEOUT_MS,
  FINDINGS_RECORDER_LIVE_TIMEOUT_MS,
} from './constants';
import { extractAnswer } from './messages';
import { runFindingsPass, type FindingsPassDeps } from './run_pass';

/** Slack above the pass's own abort, so the pass ends first and the hook never times out. */
const AFTER_EXECUTION_HOOK_TIMEOUT_MS = FINDINGS_RECORDER_FINAL_TIMEOUT_MS + 15_000;

/**
 * Records the investigation's findings from outside the agent, so the agent needs no recording
 * tools and carries none of that prompt:
 *
 * - a cycle hook starts a non-blocking pass every few cycles, so findings appear while the
 *   investigation runs. It never waits and never adds anything to the agent's context;
 * - a blocking after-execution hook runs the final pass from the agent's answer, so the verdict
 *   exists before the investigation reports completed and notifications go out.
 */
export const registerFindingsRecorder = ({
  agentBuilder,
  deps,
  logger,
  coordinator = new FindingsCoordinator(),
}: {
  agentBuilder: AgentBuilderPluginSetup;
  deps: FindingsPassDeps;
  logger: Logger;
  coordinator?: FindingsCoordinator;
}): void => {
  agentBuilder.hooks.registerCycleHook({
    id: FINDINGS_RECORDER_CYCLE_HOOK_ID,
    when: { everyCycles: FINDINGS_RECORDER_EVERY_CYCLES },
    boundAgents: [NIGHTSHIFT_INVESTIGATION_AGENT_ID],
    getHandler: ({ conversation, request, abortSignal, input }) => {
      const conversationId = conversation.id;
      if (!conversationId) return undefined;
      const question = typeof input?.message === 'string' ? input.message : undefined;

      const memory = coordinator.memory(conversationId);
      return ({ steps }) => {
        coordinator.startLive({
          conversationId,
          executionSignal: abortSignal,
          timeoutMs: FINDINGS_RECORDER_LIVE_TIMEOUT_MS,
          run: (guard) =>
            runFindingsPass(deps, { request, conversationId, steps, guard, memory, question }),
        });
      };
    },
  });

  agentBuilder.hooks.register({
    id: FINDINGS_RECORDER_AFTER_EXECUTION_HOOK_ID,
    hooks: {
      [HookLifecycle.afterExecution]: {
        mode: HookExecutionMode.blocking,
        timeout: AFTER_EXECUTION_HOOK_TIMEOUT_MS,
        handler: async (context) => {
          const { agentId, conversationId, conversationAccess, round, request } = context;
          if (
            agentId !== NIGHTSHIFT_INVESTIGATION_AGENT_ID ||
            !conversationId ||
            conversationAccess === 'readOnly'
          ) {
            return;
          }
          if (round.status !== ConversationRoundStatus.completed) {
            coordinator.release(conversationId);
            return;
          }

          try {
            const answer =
              extractAnswer({ steps: round.steps, responseMessage: round.response?.message }) ?? '';
            await coordinator.runFinal({
              conversationId,
              timeoutMs: FINDINGS_RECORDER_FINAL_TIMEOUT_MS,
              run: (guard) =>
                runFindingsPass(deps, {
                  request,
                  conversationId,
                  steps: round.steps,
                  guard,
                  memory: coordinator.memory(conversationId),
                  question: round.input?.message,
                  answer,
                }),
            });
          } catch (error) {
            // The investigation is already done: a recording failure must not fail it.
            logger.warn(
              `Findings recorder final pass failed for ${conversationId}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        },
      },
    },
  });
};
