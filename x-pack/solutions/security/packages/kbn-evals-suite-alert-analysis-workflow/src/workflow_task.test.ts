/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { extractAgentConversationIds } from '@kbn/security-evals-workflow-traces';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  type WorkflowExecutionDto,
  type WorkflowStepExecutionDto,
} from '@kbn/workflows';
import { ALERT_ANALYSIS_EVAL_ALERTS } from './synthetic_alerts';
import {
  readVerdict,
  readVerdicts,
  runAlertAnalysisWorkflow,
  withAlertData,
} from './workflow_task';

/** The tier-1 malicious-file alert the eval seeds: every grounded rationale names its entities. */
const MALICIOUS_FILE_ALERT = ALERT_ANALYSIS_EVAL_ALERTS.find(
  ({ id }) => id === 'aa-eval-tier1-malicious-file'
)!;

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

describe('runAlertAnalysisWorkflow — the alert the rationale judge is graded against', () => {
  // The rationale criteria judge receives only the example input (`{ alertId }`), the task
  // output and the metadata. `alertData` on the graded output is the ONLY reason the
  // "does not invent alert fields, file paths, commands, or entities…" criterion can be
  // checked against the alert the workflow analysed: without it, every grounded detail the
  // rationale names (process name, file path, code signer) reads as invented.
  const alertId = `${MALICIOUS_FILE_ALERT.id}-uuid`;
  const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

  /** `fetch` as the runner uses it: POST the run, then GET the finished execution. */
  const fetchReturning = (stepExecutions: WorkflowStepExecutionDto[]): HttpHandler =>
    jest
      .fn()
      .mockResolvedValueOnce({ workflowExecutionId: 'exec-1' })
      .mockResolvedValueOnce({
        id: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        traceId: 'trace-1',
        stepExecutions,
      } as unknown as WorkflowExecutionDto) as unknown as HttpHandler;

  const run = (stepExecutions: WorkflowStepExecutionDto[]) =>
    runAlertAnalysisWorkflow({
      fetch: fetchReturning(stepExecutions),
      log,
      alertId,
      alertIndex: '.alerts-security.alerts-default',
      classificationMethod: 'prompt',
      alertData: MALICIOUS_FILE_ALERT.doc,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the analysed alert document as part of the graded task output', async () => {
    const result = await run([
      step({
        stepId: 'runPrompt_step',
        stepType: 'ai.prompt',
        output: {
          content: {
            verdicts: [
              {
                id: alertId,
                classification: 'true_positive',
                confidence_score: 0.95,
                rationale: 'update_flash.exe was dropped in the user Downloads folder.',
              },
            ],
          },
        },
      }),
    ]);

    expect(result.classification).toBe('true_positive');
    expect(result.rationale).toBe('update_flash.exe was dropped in the user Downloads folder.');
    // The very document that was indexed, not a summary of it: the judge grounds the
    // rationale against these fields.
    expect(result.alertData).toBe(MALICIOUS_FILE_ALERT.doc);
    expect(result.alertData?.['process.name']).toBe('update_flash.exe');
    expect(String(result.alertData?.['file.path'])).toContain('Downloads');
  });

  it('returns the alert document even when the workflow produced no verdict', async () => {
    const result = await run([step({ stepId: 'runPrompt_step', stepType: 'ai.prompt' })]);

    expect(result.classification).toBeUndefined();
    expect(result.alertData).toBe(MALICIOUS_FILE_ALERT.doc);
  });
});

describe('withAlertData', () => {
  it('merges the document next to the verdict fields without mutating the verdict', () => {
    const verdict = {
      classification: 'true_positive',
      confidenceScore: 0.9,
      rationale: 'update_flash.exe was dropped in Downloads',
      executionId: 'exec-1',
      executionStatus: ExecutionStatus.COMPLETED,
      classificationMethod: 'prompt',
    } as const;

    const graded = withAlertData(verdict, MALICIOUS_FILE_ALERT.doc);

    expect(graded.classification).toBe('true_positive');
    expect(graded.rationale).toBe('update_flash.exe was dropped in Downloads');
    expect(graded.executionId).toBe('exec-1');
    expect(graded.alertData).toBe(MALICIOUS_FILE_ALERT.doc);
    expect(Object.keys(verdict)).not.toContain('alertData');
  });
});
