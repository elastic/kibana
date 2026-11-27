/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractAgentConversationIds } from '@kbn/security-evals-workflow-traces';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { readTiming, readVerdict, readVerdicts } from './workflow_task';

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

describe('readVerdicts', () => {
  const filterStep = (batchVerdicts: Array<Record<string, string>>) =>
    step({
      stepId: 'filter_verdicts_to_batch',
      stepType: 'data.set',
      output: { batch_verdicts: batchVerdicts },
    });

  it('grades the verdicts the batch filter accepted, not a classification reply that also echoed a foreign id', () => {
    const steps = [
      // Batch 1's reply echoes b2 (another batch's alert); the filter drops it.
      step({
        output: {
          structured_output: {
            verdicts: [
              { id: 'a1', classification: 'false_positive' },
              { id: 'b2', classification: 'true_positive' },
            ],
          },
        },
      }),
      filterStep([{ id: 'a1', classification: 'false_positive' }]),
      // Batch 2 returned nothing for b2.
      step({ output: { structured_output: { verdicts: [] } } }),
      filterStep([]),
    ];

    expect([...readVerdicts(steps).keys()]).toEqual(['a1']);
  });

  it('collects the accepted verdicts of every batch', () => {
    const steps = [
      filterStep([{ id: 'a1', classification: 'false_positive' }]),
      filterStep([{ id: 'b2', classification: 'true_positive' }]),
    ];

    expect([...readVerdicts(steps).keys()]).toEqual(['a1', 'b2']);
  });
});

describe('readTiming', () => {
  it('spans the classification records and ignores other steps', () => {
    const timing = readTiming({
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:05:00.000Z',
      stepExecutions: [
        step({
          stepId: 'enrich',
          stepType: 'elasticsearch.search',
          startedAt: '2026-10-30T10:00:01.000Z',
          finishedAt: '2026-10-30T10:00:05.000Z',
        }),
        step({ startedAt: '2026-10-30T10:01:00.000Z', finishedAt: '2026-10-30T10:02:00.000Z' }),
        step({
          stepType: 'ai.prompt',
          startedAt: '2026-10-30T10:02:00.000Z',
          finishedAt: '2026-10-30T10:03:30.000Z',
        }),
      ],
    });

    expect(timing).toEqual({
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:05:00.000Z',
      classificationStartedAt: '2026-10-30T10:01:00.000Z',
      classificationFinishedAt: '2026-10-30T10:03:30.000Z',
    });
  });

  it('reports no classification end while a record is still running', () => {
    const timing = readTiming({
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '',
      stepExecutions: [
        step({ startedAt: '2026-10-30T10:01:00.000Z', finishedAt: '2026-10-30T10:02:00.000Z' }),
        step({ startedAt: '2026-10-30T10:02:00.000Z', finishedAt: undefined }),
      ],
    });

    expect(timing.classificationStartedAt).toBe('2026-10-30T10:01:00.000Z');
    expect(timing.classificationFinishedAt).toBeUndefined();
  });

  it('still reports the end when every classification record finished', () => {
    const timing = readTiming({
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:05:00.000Z',
      stepExecutions: [
        step({ startedAt: '2026-10-30T10:01:00.000Z', finishedAt: '2026-10-30T10:02:00.000Z' }),
        step({ startedAt: '2026-10-30T10:02:00.000Z', finishedAt: '2026-10-30T10:03:00.000Z' }),
      ],
    });

    expect(timing.classificationFinishedAt).toBe('2026-10-30T10:03:00.000Z');
  });

  it('ignores a running record of a non-classification step', () => {
    const timing = readTiming({
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '2026-10-30T10:05:00.000Z',
      stepExecutions: [
        step({ startedAt: '2026-10-30T10:01:00.000Z', finishedAt: '2026-10-30T10:02:00.000Z' }),
        step({
          stepId: 'enrich',
          stepType: 'elasticsearch.search',
          startedAt: '2026-10-30T10:04:00.000Z',
          finishedAt: undefined,
        }),
      ],
    });

    expect(timing.classificationFinishedAt).toBe('2026-10-30T10:02:00.000Z');
  });

  it('leaves fields undefined when the engine reported none', () => {
    const timing = readTiming({
      startedAt: '2026-10-30T10:00:00.000Z',
      finishedAt: '',
      stepExecutions: [step({ startedAt: undefined, finishedAt: undefined })],
    });

    expect(timing.finishedAt).toBeUndefined();
    expect(timing.classificationStartedAt).toBeUndefined();
    expect(timing.classificationFinishedAt).toBeUndefined();
  });
});
