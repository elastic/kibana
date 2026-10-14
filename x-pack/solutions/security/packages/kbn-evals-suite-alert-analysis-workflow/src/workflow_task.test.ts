/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractAgentConversationIds } from '@kbn/security-evals-workflow-traces';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { readVerdict } from './workflow_task';

const step = (overrides: Partial<WorkflowStepExecutionDto>): WorkflowStepExecutionDto =>
  ({
    stepId: 'runAgent_step',
    stepType: 'ai.agent',
    output: null,
    ...overrides,
  } as WorkflowStepExecutionDto);

describe('alert-analysis conversation id extraction', () => {
  it('maps every agent step to a plain conversation id for the trace reader', () => {
    const steps = [
      step({ stepId: 'runAgent_step', output: null }),
      step({ stepId: 'runAgent_step', output: { conversation_id: 'conv-a' } }),
      step({ stepId: 'review_step', output: { conversation_id: 'conv-b' } }),
    ];

    const ids = extractAgentConversationIds(steps).map(({ conversationId }) => conversationId);

    expect(ids).toEqual(['conv-a', 'conv-b']);
  });

  it('returns no ids when the workflow produced no agent conversation', () => {
    expect(extractAgentConversationIds([step({ output: null })])).toEqual([]);
  });

  it('does not emit a duplicate id when a step is retried', () => {
    const steps = [
      step({ stepId: 'runAgent_step', output: { conversation_id: 'conv-a' } }),
      step({ stepId: 'runAgent_step', output: { conversation_id: 'conv-a' } }),
    ];

    expect(extractAgentConversationIds(steps)).toHaveLength(1);
  });
});

describe('readVerdict', () => {
  const alertId = 'aa-eval-tier1-malicious-file-uuid';

  it('matches the agent schema field `id`', () => {
    const steps = [
      step({ output: null }),
      step({
        output: {
          structured_output: {
            verdicts: [
              {
                id: alertId,
                classification: 'true_positive',
                confidence_score: 0.95,
                rationale: 'Gate A matched.',
              },
            ],
          },
        },
      }),
    ];

    expect(readVerdict(steps, alertId)?.classification).toBe('true_positive');
  });

  it('does not credit a legacy `alert_id` match (production pairs on `id` only)', () => {
    const steps = [
      step({
        output: {
          structured_output: {
            // Simulate a non-schema reply that only has alert_id — production apply_verdicts
            // would not pair this, so neither should the eval harness.
            verdicts: [
              {
                alert_id: alertId,
                classification: 'false_positive',
                confidence_score: 0.9,
              },
            ],
          },
        },
      }),
    ];

    expect(readVerdict(steps, alertId)).toBeUndefined();
  });

  it('returns undefined when no verdict matches the seeded alert id', () => {
    const steps = [
      step({
        output: {
          structured_output: {
            verdicts: [
              { id: 'other-alert', classification: 'true_positive', confidence_score: 0.9 },
            ],
          },
        },
      }),
    ];

    expect(readVerdict(steps, alertId)).toBeUndefined();
  });
});

describe('readVerdict for a prompt', () => {
  const alertId = 'aa-eval-tier1-malicious-file-uuid';
  const promptStep = (overrides: Partial<WorkflowStepExecutionDto>) =>
    step({ stepId: 'runPrompt_step', stepType: 'ai.prompt', ...overrides });

  it('reads the verdict from the prompt step content, where ai.prompt puts its reply', () => {
    const steps = [
      promptStep({ output: null }),
      promptStep({
        output: {
          content: {
            verdicts: [{ id: alertId, classification: 'false_positive', confidence_score: 0.8 }],
          },
        },
      }),
    ];

    expect(readVerdict(steps, alertId)?.classification).toBe('false_positive');
  });

  it('finds the prompt step by name when the record omits its type', () => {
    const steps = [
      promptStep({
        stepType: undefined,
        output: {
          content: {
            verdicts: [{ id: alertId, classification: 'true_positive', confidence_score: 0.9 }],
          },
        },
      }),
    ];

    expect(readVerdict(steps, alertId)?.classification).toBe('true_positive');
  });

  it('ignores a step that is neither the agent nor the prompt', () => {
    const steps = [
      step({
        stepId: 'other_step',
        stepType: 'data.set',
        output: {
          content: {
            verdicts: [{ id: alertId, classification: 'true_positive', confidence_score: 0.9 }],
          },
        },
      }),
    ];

    expect(readVerdict(steps, alertId)).toBeUndefined();
  });
});
