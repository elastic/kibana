/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractAgentConversationIds,
  extractFirstAgentConversationId,
} from './agent_conversation_ids';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';

const step = (over: Partial<WorkflowStepExecutionDto>): WorkflowStepExecutionDto =>
  ({ stepId: 'draft_creation', ...over } as WorkflowStepExecutionDto);

describe('extractAgentConversationIds', () => {
  it('skips the step_level_timeout wrapper and reads the real ai.agent step', () => {
    const steps = [
      step({ stepType: 'step_level_timeout', output: undefined }),
      step({
        stepType: 'ai.agent',
        output: { conversation_id: '91ac5936-694f-4308-8b86-e41189e9a0cf', message: 'ok' },
      }),
    ];

    expect(extractAgentConversationIds(steps)).toEqual([
      {
        stepId: 'draft_creation',
        conversationId: '91ac5936-694f-4308-8b86-e41189e9a0cf',
        stepType: 'ai.agent',
      },
    ]);
  });

  it('returns every ai.agent conversation id in a multi-step workflow', () => {
    // draft → review → rewrite: each agent step opens its own conversation.
    const steps = [
      step({
        stepId: 'draft_creation',
        stepType: 'step_level_timeout',
        output: undefined,
      }),
      step({
        stepId: 'draft_creation',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-draft' },
      }),
      step({
        stepId: 'review_gate',
        stepType: 'wait_for_input',
        output: { approved: true },
      }),
      step({
        stepId: 'review_agent',
        stepType: 'step_level_timeout',
        output: undefined,
      }),
      step({
        stepId: 'review_agent',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-review' },
      }),
      step({
        stepId: 'rewrite_agent',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-rewrite' },
      }),
    ];

    expect(extractAgentConversationIds(steps)).toEqual([
      { stepId: 'draft_creation', conversationId: 'conv-draft', stepType: 'ai.agent' },
      { stepId: 'review_agent', conversationId: 'conv-review', stepType: 'ai.agent' },
      { stepId: 'rewrite_agent', conversationId: 'conv-rewrite', stepType: 'ai.agent' },
    ]);
  });

  it('dedupes identical conversation ids while preserving first-seen order', () => {
    const steps = [
      step({
        stepId: 'draft_creation',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-shared' },
      }),
      // A retried step reuses the conversation id; it must not be emitted twice.
      step({
        stepId: 'draft_creation',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-shared' },
      }),
      step({
        stepId: 'followup_agent',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-followup' },
      }),
    ];

    expect(extractAgentConversationIds(steps).map((r) => r.conversationId)).toEqual([
      'conv-shared',
      'conv-followup',
    ]);
  });

  it('returns an empty array when no step carries a conversation id', () => {
    const steps = [
      step({ stepType: 'step_level_timeout', output: undefined }),
      step({ stepId: 'if_review_creation', stepType: 'if', output: {} }),
    ];

    expect(extractAgentConversationIds(steps)).toEqual([]);
  });

  it('ignores a non-string or empty conversation_id', () => {
    const steps = [
      step({ stepType: 'ai.agent', output: { conversation_id: '' } }),
      step({ stepType: 'ai.agent', output: { conversation_id: 42 } }),
      step({ stepType: 'ai.agent', output: { conversation_id: null } }),
      step({
        stepId: 'real_agent',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-real' },
      }),
    ];

    expect(extractAgentConversationIds(steps)).toEqual([
      { stepId: 'real_agent', conversationId: 'conv-real', stepType: 'ai.agent' },
    ]);
  });
});

describe('extractFirstAgentConversationId', () => {
  it('returns only the first conversation id (single-agent convenience)', () => {
    const steps = [
      step({
        stepId: 'draft_creation',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-draft' },
      }),
      step({
        stepId: 'review_agent',
        stepType: 'ai.agent',
        output: { conversation_id: 'conv-review' },
      }),
    ];

    expect(extractFirstAgentConversationId(steps)).toBe('conv-draft');
  });

  it('returns undefined when no conversation id is present', () => {
    expect(extractFirstAgentConversationId([])).toBeUndefined();
  });
});
