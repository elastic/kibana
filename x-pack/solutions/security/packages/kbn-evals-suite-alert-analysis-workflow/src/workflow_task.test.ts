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
  readVerdict,
  readVerdicts,
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
    jest.fn(async (path: string, options?: { method?: string }) => {
      if (options?.method === 'DELETE') {
        return { success: true };
      }
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
      classificationMethod: 'agent',
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

  it.each([
    [['attachments.add']],
    [['attachments.read', 'write_todos']],
    [['load_skill', 'search_relevant_skills', 'set_conversation_metadata']],
    [['sleep']],
    [['describe_api', 'describe_api_type']],
  ])('ignores runtime-injected harness tools %j: trajectory scores 1', async (ids) => {
    const client = traceClient({
      columns: [{ name: 'tool_id' }],
      values: ids.map((id) => [id]),
    });

    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), client);

    expect(verdict.toolCallIds).toEqual(ids);
    expect(await evaluateTrajectory(verdict)).toEqual(
      expect.objectContaining({ score: 1, label: 'match' })
    );
  });

  it('still fails trajectory when a domain tool is called alongside a harness tool', async () => {
    const client = traceClient({
      columns: [{ name: 'tool_id' }],
      values: [['attachments.add'], ['security.get_alerts']],
    });

    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), client);

    expect(await evaluateTrajectory(verdict)).toEqual(
      expect.objectContaining({ score: 0, label: 'unexpected-tools' })
    );
  });

  it('reports excluded harness calls in metadata without changing the score', async () => {
    const client = traceClient({
      columns: [{ name: 'tool_id' }],
      values: [['load_skill'], ['sleep']],
    });

    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), client);
    const result = await evaluateTrajectory(verdict);

    expect(result).toEqual(expect.objectContaining({ score: 1, label: 'match' }));
    expect(result.metadata).toEqual(
      expect.objectContaining({ harnessToolCalls: ['load_skill', 'sleep'] })
    );
  });

  it('returns the stored conversation ids and deletes each exactly once', async () => {
    const client = traceClient({
      columns: [{ name: 'tool_id' }],
      values: [['platform.core.search']],
    });
    const fetch = mockFetch(verdictOutput({ conversation_id: 'conv-1' }));

    const verdict = await run(fetch, client);

    expect(verdict.conversationIds).toEqual(['conv-1']);
    expect(verdict.undeletedConversationIds).toEqual([]);
    const deletes = (fetch as unknown as jest.Mock).mock.calls.filter(
      ([, options]) => options?.method === 'DELETE'
    );
    expect(deletes.map(([path]) => path)).toEqual(['/api/agent_builder/conversations/conv-1']);
  });

  it('swallows a conversation delete failure and reports the id as undeleted', async () => {
    const client = traceClient({
      columns: [{ name: 'tool_id' }],
      values: [['security.get_alerts']],
    });
    const fetch = jest.fn(async (path: string, options?: { method?: string }) => {
      if (options?.method === 'DELETE') {
        throw new Error('boom');
      }
      if (path.endsWith('/run')) {
        return { workflowExecutionId: 'exec-1' };
      }
      return {
        status: 'completed',
        traceId: 'trace-1',
        stepExecutions: [
          {
            stepId: 'runAgent_step',
            stepType: 'ai.agent',
            output: verdictOutput({ conversation_id: 'conv-1' }),
          },
        ],
      };
    }) as unknown as HttpHandler;

    const verdict = await run(fetch, client);

    expect(verdict.classification).toBe('true_positive');
    expect(verdict.toolCallIds).toEqual(['security.get_alerts']);
    expect(verdict.undeletedConversationIds).toEqual(['conv-1']);
  });

  it('does not delete anything when the agent step stored no conversation', async () => {
    const fetch = mockFetch(verdictOutput());

    const verdict = await run(fetch, undefined);

    expect(verdict.conversationIds).toEqual([]);
    expect(
      (fetch as unknown as jest.Mock).mock.calls.some(([, options]) => options?.method === 'DELETE')
    ).toBe(false);
  });

  describe('when polling the execution throws', () => {
    const runningWithConversation = {
      status: 'running',
      traceId: 'trace-1',
      stepExecutions: [
        {
          stepId: 'runAgent_step',
          stepType: 'ai.agent',
          output: { conversation_id: 'conv-leak' },
        },
      ],
    };

    const failingFetch = ({ cleanupReadWorks }: { cleanupReadWorks: boolean }) => {
      let gets = 0;
      return jest.fn(async (path: string, options?: { method?: string }) => {
        if (options?.method === 'DELETE') {
          return { success: true };
        }
        if (path.endsWith('/run')) {
          return { workflowExecutionId: 'exec-1' };
        }
        gets += 1;
        // 1st poll succeeds with a stored conversation, the 2nd poll fails, and the cleanup
        // read (3rd GET) either succeeds or fails.
        if (gets === 1 || (gets === 3 && cleanupReadWorks)) {
          return runningWithConversation;
        }
        throw new Error('poll failed');
      }) as unknown as HttpHandler;
    };

    const deletedPaths = (fetch: HttpHandler) =>
      (fetch as unknown as jest.Mock).mock.calls
        .filter(([, options]) => options?.method === 'DELETE')
        .map(([path]) => path);

    it.each([[true], [false]])(
      'deletes the stored conversation and rethrows the original error (cleanup read works: %s)',
      async (cleanupReadWorks) => {
        const fetch = failingFetch({ cleanupReadWorks });

        await expect(run(fetch, undefined)).rejects.toThrow('poll failed');

        expect(deletedPaths(fetch)).toEqual(['/api/agent_builder/conversations/conv-leak']);
      }
    );

    it('still rethrows the original error when the cleanup delete also fails', async () => {
      const base = failingFetch({ cleanupReadWorks: true }) as unknown as jest.Mock;
      const fetch = jest.fn(async (path: string, options?: { method?: string }) => {
        if (options?.method === 'DELETE') {
          throw new Error('delete failed');
        }
        return base(path, options);
      }) as unknown as HttpHandler;

      await expect(run(fetch, undefined)).rejects.toThrow('poll failed');
    });
  });

  it('negative control: N/A when the trace client is unreachable', async () => {
    const verdict = await run(mockFetch(verdictOutput({ conversation_id: 'conv-1' })), undefined);

    expect(verdict.toolCallsUnavailable).toBe(true);
    expect(await evaluateTrajectory(verdict)).toEqual(
      expect.objectContaining({ score: null, label: 'N/A' })
    );
  });

  it('N/A when the agent step output has no conversation_id', async () => {
    const client = traceClient({ columns: [{ name: 'tool_id' }], values: [] });

    const verdict = await run(mockFetch(verdictOutput()), client);

    expect(client.transport.request).not.toHaveBeenCalled();
    expect(verdict.toolCallsUnavailable).toBe(true);
  });
});
