/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import * as extractionModule from '.';
import { extractCustomWorkflowResult } from '.';

const workflowId = 'test-workflow';
const workflowRunId = 'test-run-1';

const baseExecution: WorkflowExecutionDto = {
  id: 'exec-1',
  spaceId: 'default',
  status: 'completed',
  stepExecutions: [],
  workflowId,
} as unknown as WorkflowExecutionDto;

describe('module exports', () => {
  it('does not export convertEsqlResultToAlerts', () => {
    expect(extractionModule).not.toHaveProperty('convertEsqlResultToAlerts');
  });

  it('exports extractCustomWorkflowResult', () => {
    expect(extractionModule).toHaveProperty('extractCustomWorkflowResult');
  });
});

describe('extractCustomWorkflowResult', () => {
  it('throws when workflow execution failed', () => {
    expect(() =>
      extractCustomWorkflowResult({
        execution: {
          ...baseExecution,
          error: { message: 'Something went wrong' },
          status: 'failed',
        } as unknown as WorkflowExecutionDto,
        workflowId,
        workflowRunId,
      })
    ).toThrow(`Custom alert retrieval workflow ${workflowId} failed: Something went wrong`);
  });

  it('throws with "Unknown error" when failed execution has no error message', () => {
    expect(() =>
      extractCustomWorkflowResult({
        execution: {
          ...baseExecution,
          status: 'failed',
        } as unknown as WorkflowExecutionDto,
        workflowId,
        workflowRunId,
      })
    ).toThrow(`Custom alert retrieval workflow ${workflowId} failed: Unknown error`);
  });

  it('throws when workflow execution was cancelled', () => {
    expect(() =>
      extractCustomWorkflowResult({
        execution: { ...baseExecution, status: 'cancelled' } as unknown as WorkflowExecutionDto,
        workflowId,
        workflowRunId,
      })
    ).toThrow(
      `Alert retrieval workflow (id: ${workflowId}) was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.`
    );
  });

  it('throws when workflow execution timed out', () => {
    expect(() =>
      extractCustomWorkflowResult({
        execution: { ...baseExecution, status: 'timed_out' } as unknown as WorkflowExecutionDto,
        workflowId,
        workflowRunId,
      })
    ).toThrow(
      `Alert retrieval workflow (id: ${workflowId}) timed out. Consider increasing the workflow timeout or reducing the alert count.`
    );
  });

  it('selects the output from the last step execution', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: ['first-step-alert'],
            stepId: 'step_1',
            stepType: 'custom.first',
          },
          {
            output: ['last-step-alert-1', 'last-step-alert-2'],
            stepId: 'step_2',
            stepType: 'custom.last',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['last-step-alert-1', 'last-step-alert-2'],
      alertsContextCount: 2,
      workflowId,
      workflowRunId,
    });
  });

  it('normalizes ES|QL output from the last step into CSV-formatted strings', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              columns: [
                { name: '_id', type: 'keyword' },
                { name: 'kibana.alert.rule.name', type: 'keyword' },
              ],
              values: [
                ['alert-1', 'Rule A'],
                ['alert-2', 'Rule B'],
              ],
            },
            stepId: 'query_alerts',
            stepType: 'elasticsearch.esql.query',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result.alerts).toHaveLength(2);
    expect(result.alerts[0]).toBe(['_id,alert-1', 'kibana.alert.rule.name,Rule A'].join('\n'));
    expect(result.alerts[1]).toBe(['_id,alert-2', 'kibana.alert.rule.name,Rule B'].join('\n'));
  });

  it('normalizes a plain array output from the last step', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: ['alert-string-1', 'alert-string-2'],
            stepId: 'retrieve_alerts',
            stepType: 'custom.retrieval',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['alert-string-1', 'alert-string-2'],
      alertsContextCount: 2,
      workflowId,
      workflowRunId,
    });
  });

  it('normalizes an object array output from the last step by JSON-stringifying each element', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: [
              { _id: 'alert-1', rule: 'Suspicious Process' },
              { _id: 'alert-2', rule: 'Malware Detected' },
            ],
            stepId: 'retrieve_alerts',
            stepType: 'custom.retrieval',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result.alerts).toHaveLength(2);
    expect(JSON.parse(result.alerts[0])).toEqual({ _id: 'alert-1', rule: 'Suspicious Process' });
    expect(JSON.parse(result.alerts[1])).toEqual({ _id: 'alert-2', rule: 'Malware Detected' });
  });

  it('normalizes a plain object output from the last step by JSON-stringifying it', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: { summary: 'Alert summary data', count: 5 },
            stepId: 'summarize',
            stepType: 'custom.summarize',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result.alerts).toHaveLength(1);
    expect(JSON.parse(result.alerts[0])).toEqual({ summary: 'Alert summary data', count: 5 });
  });

  it('normalizes a string output from the last step by wrapping it in an array', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: 'single alert string content',
            stepId: 'format_output',
            stepType: 'custom.format',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['single alert string content'],
      alertsContextCount: 1,
      workflowId,
      workflowRunId,
    });
  });

  it('skips a step with stepId "trigger" when selecting the last step', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: ['real-alert-1', 'real-alert-2'],
            stepId: 'query_step',
            stepType: 'elasticsearch.esql.query',
          },
          {
            output: { trigger_data: 'should be ignored' },
            stepId: 'trigger',
            stepType: 'trigger',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['real-alert-1', 'real-alert-2'],
      alertsContextCount: 2,
      workflowId,
      workflowRunId,
    });
  });

  it('returns empty result when only trigger steps have output', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: { alerts: ['trigger-alert'] },
            stepId: 'trigger',
            stepType: 'trigger',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: [],
      alertsContextCount: 0,
      workflowId,
      workflowRunId,
    });
  });

  it('ignores an earlier ES|QL step when the last step has different output', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              columns: [{ name: '_id', type: 'keyword' }],
              values: [['esql-alert-1']],
            },
            stepId: 'query_alerts',
            stepType: 'elasticsearch.esql.query',
          },
          {
            output: ['formatted-alert-from-last-step'],
            stepId: 'format_results',
            stepType: 'custom.format',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['formatted-alert-from-last-step'],
      alertsContextCount: 1,
      workflowId,
      workflowRunId,
    });
  });

  it('ignores an earlier legacy alert retrieval step when the last step has different output', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              alerts: ['legacy-alert'],
              alerts_context_count: 1,
            },
            stepId: 'legacy_retrieval',
            stepType: 'attack-discovery.defaultAlertRetrieval',
          },
          {
            output: ['transformed-alert-1', 'transformed-alert-2'],
            stepId: 'transform_results',
            stepType: 'custom.transform',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['transformed-alert-1', 'transformed-alert-2'],
      alertsContextCount: 2,
      workflowId,
      workflowRunId,
    });
  });

  it('ignores an earlier step with an alerts array when the last step has different output', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: { alerts: ['generic-alert-from-earlier-step'] },
            stepId: 'early_retrieval',
            stepType: 'custom.retrieval',
          },
          {
            output: ['final-alert-from-last-step'],
            stepId: 'final_format',
            stepType: 'custom.format',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['final-alert-from-last-step'],
      alertsContextCount: 1,
      workflowId,
      workflowRunId,
    });
  });

  it('skips steps with null output and selects the last step that has output', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: ['alert-from-first-step'],
            stepId: 'step_1',
            stepType: 'custom.retrieve',
          },
          {
            output: null,
            stepId: 'step_2',
            stepType: 'custom.transform',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: ['alert-from-first-step'],
      alertsContextCount: 1,
      workflowId,
      workflowRunId,
    });
  });

  it('returns empty result when there are no step executions', () => {
    const result = extractCustomWorkflowResult({
      execution: baseExecution,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: [],
      alertsContextCount: 0,
      workflowId,
      workflowRunId,
    });
  });

  it('returns empty result when all steps have null output', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: null,
            stepId: 'step_1',
            stepType: 'custom.first',
          },
          {
            output: null,
            stepId: 'step_2',
            stepType: 'custom.second',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result).toEqual({
      alerts: [],
      alertsContextCount: 0,
      workflowId,
      workflowRunId,
    });
  });

  it('sets alertsContextCount to the number of normalized alerts', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: ['alert-1', 'alert-2', 'alert-3'],
            stepId: 'retrieve',
            stepType: 'custom.retrieval',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId,
      workflowRunId,
    });

    expect(result.alertsContextCount).toBe(3);
  });

  it('includes workflowId and workflowRunId in the result', () => {
    const result = extractCustomWorkflowResult({
      execution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: ['alert-1'],
            stepId: 'retrieve',
            stepType: 'custom.retrieval',
          },
        ],
      } as unknown as WorkflowExecutionDto,
      workflowId: 'my-custom-workflow',
      workflowRunId: 'run-42',
    });

    expect(result.workflowId).toBe('my-custom-workflow');
    expect(result.workflowRunId).toBe('run-42');
  });
});
