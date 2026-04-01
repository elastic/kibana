/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import {
  GET_EXECUTION_SUMMARY_TOOL_ID,
  getExecutionSummaryTool,
  type WorkflowExecutionFetcher,
} from '.';

const getMockStepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto => ({
  error: undefined,
  executionTimeMs: 1500,
  finishedAt: '2026-03-13T00:00:01.500Z',
  globalExecutionIndex: 0,
  id: 'step-exec-1',
  input: { query: 'FROM .alerts-security.alerts-default' },
  output: { alerts: [{ _id: 'alert-1' }, { _id: 'alert-2' }] },
  scopeStack: [],
  startedAt: '2026-03-13T00:00:00.000Z',
  state: undefined,
  status: ExecutionStatus.COMPLETED,
  stepExecutionIndex: 0,
  stepId: 'retrieve_alerts',
  stepType: 'connector',
  topologicalIndex: 0,
  workflowId: 'alert-retrieval-workflow',
  workflowRunId: 'alert-retrieval-run-1',
  ...overrides,
});

const getMockExecution = (overrides: Partial<WorkflowExecutionDto> = {}): WorkflowExecutionDto => ({
  context: undefined,
  duration: 3000,
  entryTransactionId: undefined,
  error: null,
  finishedAt: '2026-03-13T00:00:03.000Z',
  id: 'alert-retrieval-run-1',
  isTestRun: false,
  spaceId: 'test-space',
  startedAt: '2026-03-13T00:00:00.000Z',
  status: ExecutionStatus.COMPLETED,
  stepExecutions: [getMockStepExecution()],
  traceId: undefined,
  workflowDefinition: {} as WorkflowExecutionDto['workflowDefinition'],
  workflowId: 'alert-retrieval-workflow',
  workflowName: 'Alert Retrieval',
  yaml: 'name: Alert Retrieval\nsteps:\n  - id: retrieve_alerts\n    type: connector',
  ...overrides,
});

describe('GET_EXECUTION_SUMMARY_TOOL_ID', () => {
  it('has the expected value', () => {
    expect(GET_EXECUTION_SUMMARY_TOOL_ID).toBe('security.attack-discovery.get_execution_summary');
  });
});

describe('getExecutionSummaryTool', () => {
  const mockLogger = loggingSystemMock.createLogger();
  const mockEsClient = elasticsearchClientMock.createScopedClusterClient();
  const mockGetWorkflowExecution = jest.fn<
    ReturnType<WorkflowExecutionFetcher['getWorkflowExecution']>,
    Parameters<WorkflowExecutionFetcher['getWorkflowExecution']>
  >();

  const mockContext: ToolHandlerContext = {
    attachments: {} as never,
    esClient: mockEsClient,
    events: {} as never,
    filestore: {} as never,
    logger: mockLogger,
    modelProvider: {} as never,
    prompts: {} as never,
    request: {} as never,
    resultStore: {} as never,
    runContext: { runId: 'test-run-id', stack: [] },
    runner: {} as never,
    savedObjectsClient: {} as never,
    skills: {} as never,
    spaceId: 'test-space',
    stateManager: {} as never,
    toolManager: {} as never,
    toolProvider: {} as never,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a tool with the expected id', () => {
    const tool = getExecutionSummaryTool({
      getWorkflowExecution: mockGetWorkflowExecution,
    });

    expect(tool.id).toBe(GET_EXECUTION_SUMMARY_TOOL_ID);
  });

  it('returns a builtin tool type', () => {
    const tool = getExecutionSummaryTool({
      getWorkflowExecution: mockGetWorkflowExecution,
    });

    expect(tool.type).toBe(ToolType.builtin);
  });

  it('has a non-empty description', () => {
    const tool = getExecutionSummaryTool({
      getWorkflowExecution: mockGetWorkflowExecution,
    });

    expect(tool.description.length).toBeGreaterThan(0);
  });

  describe('schema', () => {
    it('accepts an empty object (all fields optional)', () => {
      const tool = getExecutionSummaryTool({
        getWorkflowExecution: mockGetWorkflowExecution,
      });

      const parsed = tool.schema.safeParse({});

      expect(parsed.success).toBe(true);
    });

    it('accepts alert_retrieval_run_ids', () => {
      const tool = getExecutionSummaryTool({
        getWorkflowExecution: mockGetWorkflowExecution,
      });

      const parsed = tool.schema.safeParse({
        alert_retrieval_run_ids: [{ workflow_id: 'wf-1', workflow_run_id: 'run-1' }],
      });

      expect(parsed.success).toBe(true);
    });

    it('accepts generation run fields', () => {
      const tool = getExecutionSummaryTool({
        getWorkflowExecution: mockGetWorkflowExecution,
      });

      const parsed = tool.schema.safeParse({
        generation_run_id: 'gen-run-1',
        generation_workflow_id: 'gen-wf-1',
      });

      expect(parsed.success).toBe(true);
    });

    it('accepts validation run fields', () => {
      const tool = getExecutionSummaryTool({
        getWorkflowExecution: mockGetWorkflowExecution,
      });

      const parsed = tool.schema.safeParse({
        validation_run_id: 'val-run-1',
        validation_workflow_id: 'val-wf-1',
      });

      expect(parsed.success).toBe(true);
    });

    it('accepts all fields together', () => {
      const tool = getExecutionSummaryTool({
        getWorkflowExecution: mockGetWorkflowExecution,
      });

      const parsed = tool.schema.safeParse({
        alert_retrieval_run_ids: [
          { workflow_id: 'ar-wf-1', workflow_run_id: 'ar-run-1' },
          { workflow_id: 'ar-wf-2', workflow_run_id: 'ar-run-2' },
        ],
        generation_run_id: 'gen-run-1',
        generation_workflow_id: 'gen-wf-1',
        validation_run_id: 'val-run-1',
        validation_workflow_id: 'val-wf-1',
      });

      expect(parsed.success).toBe(true);
    });
  });

  describe('handler', () => {
    describe('fetching executions', () => {
      it('calls getWorkflowExecution for each alert retrieval run', async () => {
        mockGetWorkflowExecution.mockResolvedValue(getMockExecution());

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        await tool.handler(
          {
            alert_retrieval_run_ids: [
              { workflow_id: 'ar-wf-1', workflow_run_id: 'ar-run-1' },
              { workflow_id: 'ar-wf-2', workflow_run_id: 'ar-run-2' },
            ],
          },
          mockContext
        );

        expect(mockGetWorkflowExecution).toHaveBeenCalledWith('ar-run-1', 'test-space', {
          includeInput: false,
          includeOutput: false,
        });
        expect(mockGetWorkflowExecution).toHaveBeenCalledWith('ar-run-2', 'test-space', {
          includeInput: false,
          includeOutput: false,
        });
      });

      it('calls getWorkflowExecution for the generation run', async () => {
        mockGetWorkflowExecution.mockResolvedValue(getMockExecution());

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        await tool.handler(
          {
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        expect(mockGetWorkflowExecution).toHaveBeenCalledWith('gen-run-1', 'test-space', {
          includeInput: false,
          includeOutput: false,
        });
      });

      it('calls getWorkflowExecution for the validation run', async () => {
        mockGetWorkflowExecution.mockResolvedValue(getMockExecution());

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        await tool.handler(
          {
            validation_run_id: 'val-run-1',
            validation_workflow_id: 'val-wf-1',
          },
          mockContext
        );

        expect(mockGetWorkflowExecution).toHaveBeenCalledWith('val-run-1', 'test-space', {
          includeInput: false,
          includeOutput: false,
        });
      });

      it('does NOT call getWorkflowExecution when no run IDs are provided', async () => {
        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        await tool.handler({}, mockContext);

        expect(mockGetWorkflowExecution).not.toHaveBeenCalled();
      });
    });

    describe('response structure', () => {
      it('returns per-workflow summary fields for alert retrieval', async () => {
        const execution = getMockExecution({
          duration: 5000,
          error: null,
          finishedAt: '2026-03-13T00:00:05.000Z',
          id: 'ar-run-1',
          startedAt: '2026-03-13T00:00:00.000Z',
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [],
          workflowName: 'Alert Retrieval',
          yaml: 'name: Alert Retrieval',
        });
        mockGetWorkflowExecution.mockResolvedValue(execution);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            alert_retrieval_run_ids: [{ workflow_id: 'ar-wf-1', workflow_run_id: 'ar-run-1' }],
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                alert_retrieval: [
                  expect.objectContaining({
                    duration: 5000,
                    error: null,
                    finishedAt: '2026-03-13T00:00:05.000Z',
                    startedAt: '2026-03-13T00:00:00.000Z',
                    status: ExecutionStatus.COMPLETED,
                    steps: [],
                    workflowName: 'Alert Retrieval',
                    yaml: 'name: Alert Retrieval',
                  }),
                ],
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });

      it('returns per-step summary fields', async () => {
        const stepExecution = getMockStepExecution({
          error: { type: 'timeout', message: 'Step timed out' },
          executionTimeMs: 30000,
          status: ExecutionStatus.TIMED_OUT,
          stepId: 'generate_discoveries',
          stepType: 'connector',
          topologicalIndex: 2,
        });

        const execution = getMockExecution({
          id: 'gen-run-1',
          stepExecutions: [stepExecution],
        });
        mockGetWorkflowExecution.mockResolvedValue(execution);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                generation: expect.objectContaining({
                  steps: [
                    {
                      error: { type: 'timeout', message: 'Step timed out' },
                      executionTimeMs: 30000,
                      status: ExecutionStatus.TIMED_OUT,
                      stepId: 'generate_discoveries',
                      stepType: 'connector',
                      topologicalIndex: 2,
                    },
                  ],
                }),
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });

      it('returns null for generation when no generation_run_id is provided', async () => {
        mockGetWorkflowExecution.mockResolvedValue(getMockExecution());

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            alert_retrieval_run_ids: [{ workflow_id: 'ar-wf-1', workflow_run_id: 'ar-run-1' }],
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                generation: null,
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });

      it('returns null for validation when no validation_run_id is provided', async () => {
        mockGetWorkflowExecution.mockResolvedValue(getMockExecution());

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                validation: null,
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });

      it('returns an empty alert_retrieval array when no alert_retrieval_run_ids are provided', async () => {
        mockGetWorkflowExecution.mockResolvedValue(getMockExecution());

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                alert_retrieval: [],
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });

    describe('excludes sensitive data', () => {
      it('excludes step output fields from the response', async () => {
        const stepWithOutput = getMockStepExecution({
          output: { alerts: [{ _id: 'secret-alert' }] },
        });

        const execution = getMockExecution({
          id: 'ar-run-1',
          stepExecutions: [stepWithOutput],
        });
        mockGetWorkflowExecution.mockResolvedValue(execution);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            alert_retrieval_run_ids: [{ workflow_id: 'ar-wf-1', workflow_run_id: 'ar-run-1' }],
          },
          mockContext
        );

        const data = (result as unknown as { results: Array<{ data: Record<string, unknown> }> })
          .results[0].data as {
          alert_retrieval: Array<{ steps: Array<Record<string, unknown>> }>;
        };

        const step = data.alert_retrieval[0].steps[0];
        expect(step).not.toHaveProperty('output');
      });

      it('excludes step input fields from the response', async () => {
        const stepWithInput = getMockStepExecution({
          input: { query: 'sensitive ES|QL query' },
        });

        const execution = getMockExecution({
          id: 'gen-run-1',
          stepExecutions: [stepWithInput],
        });
        mockGetWorkflowExecution.mockResolvedValue(execution);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        const data = (result as unknown as { results: Array<{ data: Record<string, unknown> }> })
          .results[0].data as {
          generation: { steps: Array<Record<string, unknown>> };
        };

        const step = data.generation.steps[0];
        expect(step).not.toHaveProperty('input');
      });
    });

    describe('error handling', () => {
      it('returns not_found for an execution that does not exist', async () => {
        mockGetWorkflowExecution.mockResolvedValue(null);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            generation_run_id: 'missing-run',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                generation: expect.objectContaining({
                  error: expect.stringContaining('missing-run'),
                  status: 'not_found',
                }),
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });

      it('returns not_found for alert retrieval executions that do not exist', async () => {
        mockGetWorkflowExecution.mockResolvedValue(null);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            alert_retrieval_run_ids: [
              { workflow_id: 'ar-wf-1', workflow_run_id: 'missing-ar-run' },
            ],
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: expect.objectContaining({
                alert_retrieval: [
                  expect.objectContaining({
                    error: expect.stringContaining('missing-ar-run'),
                    status: 'not_found',
                  }),
                ],
              }),
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });

      it('returns an error result when getWorkflowExecution throws', async () => {
        mockGetWorkflowExecution.mockRejectedValue(new Error('ES connection failed'));

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: {
                message: expect.stringContaining('ES connection failed'),
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.error,
            },
          ],
        });
      });

      it('handles non-Error thrown values', async () => {
        mockGetWorkflowExecution.mockRejectedValue('unexpected string error');

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            validation_run_id: 'val-run-1',
            validation_workflow_id: 'val-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: {
                message: expect.stringContaining('Unknown error'),
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.error,
            },
          ],
        });
      });
    });

    describe('full pipeline summary', () => {
      it('returns a complete summary with all three phases', async () => {
        const alertRetrievalExecution = getMockExecution({
          duration: 2000,
          id: 'ar-run-1',
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            getMockStepExecution({
              executionTimeMs: 2000,
              status: ExecutionStatus.COMPLETED,
              stepId: 'fetch_alerts',
              stepType: 'esql',
              topologicalIndex: 0,
            }),
          ],
          workflowName: 'Alert Retrieval',
          yaml: 'name: Alert Retrieval\nsteps: []',
        });

        const generationExecution = getMockExecution({
          duration: 15000,
          error: null,
          id: 'gen-run-1',
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            getMockStepExecution({
              executionTimeMs: 10000,
              status: ExecutionStatus.COMPLETED,
              stepId: 'generate',
              stepType: 'connector',
              topologicalIndex: 0,
            }),
            getMockStepExecution({
              executionTimeMs: 5000,
              status: ExecutionStatus.COMPLETED,
              stepId: 'parse_output',
              stepType: 'transform',
              topologicalIndex: 1,
            }),
          ],
          workflowName: 'Generation',
          yaml: 'name: Generation\nsteps: []',
        });

        const validationExecution = getMockExecution({
          duration: 8000,
          error: { type: 'validation_error', message: 'Schema mismatch' },
          id: 'val-run-1',
          status: ExecutionStatus.FAILED,
          stepExecutions: [
            getMockStepExecution({
              error: { type: 'validation_error', message: 'Schema mismatch' },
              executionTimeMs: 8000,
              status: ExecutionStatus.FAILED,
              stepId: 'validate',
              stepType: 'connector',
              topologicalIndex: 0,
            }),
          ],
          workflowName: 'Validation',
          yaml: 'name: Validation\nsteps: []',
        });

        mockGetWorkflowExecution
          .mockResolvedValueOnce(alertRetrievalExecution)
          .mockResolvedValueOnce(generationExecution)
          .mockResolvedValueOnce(validationExecution);

        const tool = getExecutionSummaryTool({
          getWorkflowExecution: mockGetWorkflowExecution,
        });

        const result = await tool.handler(
          {
            alert_retrieval_run_ids: [{ workflow_id: 'ar-wf-1', workflow_run_id: 'ar-run-1' }],
            generation_run_id: 'gen-run-1',
            generation_workflow_id: 'gen-wf-1',
            validation_run_id: 'val-run-1',
            validation_workflow_id: 'val-wf-1',
          },
          mockContext
        );

        expect(result).toEqual({
          results: [
            {
              data: {
                alert_retrieval: [
                  {
                    duration: 2000,
                    error: null,
                    finishedAt: '2026-03-13T00:00:03.000Z',
                    startedAt: '2026-03-13T00:00:00.000Z',
                    status: ExecutionStatus.COMPLETED,
                    steps: [
                      {
                        error: undefined,
                        executionTimeMs: 2000,
                        status: ExecutionStatus.COMPLETED,
                        stepId: 'fetch_alerts',
                        stepType: 'esql',
                        topologicalIndex: 0,
                      },
                    ],
                    workflowName: 'Alert Retrieval',
                    yaml: 'name: Alert Retrieval\nsteps: []',
                  },
                ],
                generation: {
                  duration: 15000,
                  error: null,
                  finishedAt: '2026-03-13T00:00:03.000Z',
                  startedAt: '2026-03-13T00:00:00.000Z',
                  status: ExecutionStatus.COMPLETED,
                  steps: [
                    {
                      error: undefined,
                      executionTimeMs: 10000,
                      status: ExecutionStatus.COMPLETED,
                      stepId: 'generate',
                      stepType: 'connector',
                      topologicalIndex: 0,
                    },
                    {
                      error: undefined,
                      executionTimeMs: 5000,
                      status: ExecutionStatus.COMPLETED,
                      stepId: 'parse_output',
                      stepType: 'transform',
                      topologicalIndex: 1,
                    },
                  ],
                  workflowName: 'Generation',
                  yaml: 'name: Generation\nsteps: []',
                },
                validation: {
                  duration: 8000,
                  error: { type: 'validation_error', message: 'Schema mismatch' },
                  finishedAt: '2026-03-13T00:00:03.000Z',
                  startedAt: '2026-03-13T00:00:00.000Z',
                  status: ExecutionStatus.FAILED,
                  steps: [
                    {
                      error: { type: 'validation_error', message: 'Schema mismatch' },
                      executionTimeMs: 8000,
                      status: ExecutionStatus.FAILED,
                      stepId: 'validate',
                      stepType: 'connector',
                      topologicalIndex: 0,
                    },
                  ],
                  workflowName: 'Validation',
                  yaml: 'name: Validation\nsteps: []',
                },
              },
              tool_result_id: expect.any(String),
              type: ToolResultType.other,
            },
          ],
        });
      });
    });
  });
});
