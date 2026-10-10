/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Evaluator } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractAgentConversationIds } from '@kbn/security-evals-workflow-traces';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { createAlertAnalysisTrajectoryEvaluator } from './evaluators';
import {
  readAgentVerdict,
  runAlertAnalysisWorkflow,
  type AlertAnalysisVerdict,
} from './workflow_task';

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

    expect(readAgentVerdict(steps, alertId)).toBeUndefined();
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

describe('runAlertAnalysisWorkflow trajectory join', () => {
  const ALERT_ID = 'alert-1';
  const silentLog = {
    info: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog;

  const verdictOutput = (extra: Record<string, unknown> = {}) => ({
    structured_output: {
      verdicts: [
        { id: ALERT_ID, classification: 'true_positive', confidence_score: 0.9, rationale: 'r' },
      ],
    },
    ...extra,
  });

  const mockFetch = (agentOutput: Record<string, unknown>) =>
    jest.fn(async (path: string) => {
      if (path.endsWith('/run')) {
        return { workflowExecutionId: 'exec-1' };
      }
      return {
        status: 'completed',
        traceId: 'trace-1',
        stepExecutions: [{ stepId: 'runAgent_step', stepType: 'ai.agent', output: agentOutput }],
      };
    }) as unknown as HttpHandler;

  const traceClient = (response: { columns: Array<{ name: string }>; values: unknown[][] }) =>
    ({
      transport: { request: jest.fn().mockResolvedValue(response) },
    } as unknown as EsClient);

  const run = (fetch: HttpHandler, traceEsClient?: EsClient) =>
    runAlertAnalysisWorkflow({
      fetch,
      log: silentLog,
      traceEsClient,
      alertId: ALERT_ID,
      alertIndex: '.alerts-security.alerts-default',
      pollIntervalMs: 1,
    });

  const evaluateTrajectory = (output: AlertAnalysisVerdict) =>
    createAlertAnalysisTrajectoryEvaluator().evaluate({
      input: {},
      output,
      expected: { classification: 'true_positive' },
      metadata: {},
    } as unknown as Parameters<Evaluator['evaluate']>[0]);

  it('positive control: with a conversation id and a tool span, trajectory is scored (0), not N/A', async () => {
    const client = traceClient({
      columns: [{ name: 'tool_id' }],
      values: [['platform.core.search']],
    });

    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), client);

    expect(verdict.toolCallsUnavailable).toBe(false);
    expect(verdict.toolCallIds).toEqual(['platform.core.search']);
    expect(await evaluateTrajectory(verdict)).toEqual(
      expect.objectContaining({ score: 0, label: 'unexpected-tools' })
    );
  });

  it('positive control: with a conversation id and no tool calls, trajectory scores 1', async () => {
    const client = traceClient({ columns: [{ name: 'tool_id' }], values: [] });
    // First query returns no tool ids; the span probe then reports spans exist.
    (client.transport.request as jest.Mock)
      .mockResolvedValueOnce({ columns: [{ name: 'tool_id' }], values: [] })
      .mockResolvedValueOnce({ columns: [{ name: 'span_count' }], values: [[3]] });

    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), client);

    expect(verdict.toolCallsUnavailable).toBe(false);
    expect(verdict.toolCallIds).toEqual([]);
    expect(await evaluateTrajectory(verdict)).toEqual(
      expect.objectContaining({ score: 1, label: 'match' })
    );
  });

  it('negative control: N/A when the trace client is unreachable', async () => {
    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), undefined);

    expect(verdict.toolCallsUnavailable).toBe(true);
    expect(await evaluateTrajectory(verdict)).toEqual(
      expect.objectContaining({ score: null, label: 'N/A' })
    );
  });

  it('the agent step output carries no conversation id when no conversation was created (the createConversation:false failure mode)', async () => {
    const client = traceClient({ columns: [{ name: 'tool_id' }], values: [] });

    const verdict = await run(mockFetch(verdictOutput()), client);

    expect(client.transport.request).not.toHaveBeenCalled();
    expect(verdict.toolCallsUnavailable).toBe(true);
  });
});
