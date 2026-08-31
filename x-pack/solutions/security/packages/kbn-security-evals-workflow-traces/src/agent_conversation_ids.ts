/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * One `ai.agent` step's conversation join key, keyed by the step that produced it.
 *
 * The agent invocation opens its own root trace, so the workflow's `traceId`
 * matches no agent spans. Agent tool spans are instead joined via
 * `step.output.conversation_id` ↔ `attributes.gen_ai.conversation.id`.
 */
export interface AgentConversationId {
  /** Stable step id from the workflow definition (e.g. `draft_creation`). */
  stepId: string;
  /** Conversation id persisted on the step's output by the `ai.agent` connector. */
  conversationId: string;
  /** Optional step type when present (`ai.agent`, …). */
  stepType?: string;
}

/**
 * Collects every non-empty `conversation_id` from workflow step executions.
 *
 * A workflow may contain multiple `ai.agent` steps, each with its own
 * conversation id, so all of them are returned. Selection keys off the output
 * shape rather than `stepId`, because `step_level_timeout` wrappers reuse the
 * agent step's id with a null output. Results are deduped by `conversationId`
 * in first-seen order so a retried step yields one join key.
 */
export function extractAgentConversationIds(
  steps: ReadonlyArray<Pick<WorkflowStepExecutionDto, 'stepId' | 'stepType' | 'output'>>
): AgentConversationId[] {
  const seen = new Set<string>();
  const result: AgentConversationId[] = [];

  for (const step of steps) {
    const conversationId = (step.output as { conversation_id?: unknown } | undefined)
      ?.conversation_id;
    if (
      typeof conversationId === 'string' &&
      conversationId.length > 0 &&
      !seen.has(conversationId)
    ) {
      seen.add(conversationId);
      result.push({
        stepId: step.stepId,
        conversationId,
        ...(step.stepType !== undefined ? { stepType: step.stepType } : {}),
      });
    }
  }

  return result;
}

/**
 * Convenience for the single-agent-step case. Prefer
 * {@link extractAgentConversationIds} when a workflow may contain more than one
 * `ai.agent` step; this returns only the first match.
 */
export function extractFirstAgentConversationId(
  steps: ReadonlyArray<Pick<WorkflowStepExecutionDto, 'stepId' | 'stepType' | 'output'>>
): string | undefined {
  return extractAgentConversationIds(steps)[0]?.conversationId;
}
