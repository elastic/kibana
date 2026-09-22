/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractAgentConversationIds } from '@kbn/security-evals-workflow-traces';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { readAgentVerdict } from './workflow_task';

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

describe('readAgentVerdict', () => {
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

    expect(readAgentVerdict(steps, alertId)?.classification).toBe('true_positive');
  });

  it('still matches legacy `alert_id` if present', () => {
    const steps = [
      step({
        output: {
          structured_output: {
            verdicts: [
              { alert_id: alertId, classification: 'false_positive', confidence_score: 0.9 },
            ],
          },
        },
      }),
    ];

    expect(readAgentVerdict(steps, alertId)?.classification).toBe('false_positive');
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

    expect(readAgentVerdict(steps, alertId)).toBeUndefined();
  });
});
