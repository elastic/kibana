/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { extractPipelineAlertData } from '.';
import type { PipelineAlertData } from '.';

const apiConfig = {
  action_type_id: '.gen-ai',
  connector_id: 'test-connector-id',
  model: 'gpt-4',
};

const workflowId = 'test-workflow';
const workflowRunId = 'test-run-1';

/** A completed default execution with ES|QL mode (has esql_query input) */
const defaultEsqlExecution: WorkflowExecutionDto = {
  stepExecutions: [
    {
      input: {
        esql_query: 'FROM .alerts-security.alerts-default METADATA _id',
      },
      output: {
        alerts: ['alert-csv-1', 'alert-csv-2'],
        alerts_context_count: 2,
        anonymized_alerts: [
          { metadata: {}, page_content: 'alert-csv-1' },
          { metadata: {}, page_content: 'alert-csv-2' },
        ],
        api_config: apiConfig,
        connector_name: 'Test Connector',
        replacements: { u1: 'REDACTED_U1' },
      },
      stepType: 'attack-discovery.defaultAlertRetrieval',
    },
  ],
  status: 'completed',
} as unknown as WorkflowExecutionDto;

/** A completed default execution with Custom query mode (no esql_query input) */
const defaultCustomQueryExecution: WorkflowExecutionDto = {
  stepExecutions: [
    {
      input: {
        filter: { bool: { must: [{ match_all: {} }] } },
      },
      output: {
        alerts: ['alert-csv-1', 'alert-csv-2'],
        alerts_context_count: 2,
        anonymized_alerts: [
          { metadata: {}, page_content: 'alert-csv-1' },
          { metadata: {}, page_content: 'alert-csv-2' },
        ],
        api_config: apiConfig,
        connector_name: 'Test Connector',
        replacements: { u1: 'REDACTED_U1' },
      },
      stepType: 'attack-discovery.defaultAlertRetrieval',
    },
  ],
  status: 'completed',
} as unknown as WorkflowExecutionDto;

/** A completed custom workflow execution with ES|QL-shaped output */
const customWorkflowEsqlExecution: WorkflowExecutionDto = {
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
  status: 'completed',
} as unknown as WorkflowExecutionDto;

/** A completed custom workflow execution with non-ES|QL output */
const customWorkflowGenericExecution: WorkflowExecutionDto = {
  stepExecutions: [
    {
      output: { summary: 'Alert summary from agent builder', count: 5 },
      stepId: 'agent_step',
      stepType: 'custom.agent_builder',
    },
  ],
  status: 'completed',
} as unknown as WorkflowExecutionDto;

describe('extractPipelineAlertData', () => {
  describe('default_esql extraction strategy', () => {
    it('returns extraction_strategy "default_esql" when step input has esql_query', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: defaultEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.extraction_strategy).toBe('default_esql');
    });

    it('returns alerts from the default step output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: defaultEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts).toEqual(['alert-csv-1', 'alert-csv-2']);
    });

    it('returns alerts_context_count as a number', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: defaultEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts_context_count).toBe(2);
    });

    it('returns a well-typed PipelineAlertData', () => {
      const result: PipelineAlertData = extractPipelineAlertData({
        apiConfig,
        execution: defaultEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result).toEqual({
        alerts: ['alert-csv-1', 'alert-csv-2'],
        alerts_context_count: 2,
        extraction_strategy: 'default_esql',
      });
    });
  });

  describe('default_custom_query extraction strategy', () => {
    it('returns extraction_strategy "default_custom_query" when step input has no esql_query', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: defaultCustomQueryExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.extraction_strategy).toBe('default_custom_query');
    });

    it('returns alerts from the default step output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: defaultCustomQueryExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts).toEqual(['alert-csv-1', 'alert-csv-2']);
    });

    it('returns alerts_context_count as a number', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: defaultCustomQueryExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts_context_count).toBe(2);
    });
  });

  describe('custom_workflow extraction strategy', () => {
    it('returns extraction_strategy "custom_workflow" for ES|QL-shaped output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: customWorkflowEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.extraction_strategy).toBe('custom_workflow');
    });

    it('returns CSV-formatted alerts from ES|QL-shaped custom workflow output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: customWorkflowEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts).toHaveLength(2);
      expect(result.alerts[0]).toBe(['_id,alert-1', 'kibana.alert.rule.name,Rule A'].join('\n'));
      expect(result.alerts[1]).toBe(['_id,alert-2', 'kibana.alert.rule.name,Rule B'].join('\n'));
    });

    it('returns alerts_context_count as a number for custom workflow with ES|QL output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: customWorkflowEsqlExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts_context_count).toBe(2);
    });

    it('returns extraction_strategy "custom_workflow" for non-ES|QL output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: customWorkflowGenericExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.extraction_strategy).toBe('custom_workflow');
    });

    it('returns alerts from non-ES|QL custom workflow output', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: customWorkflowGenericExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts).toHaveLength(1);
      expect(JSON.parse(result.alerts[0])).toEqual({
        summary: 'Alert summary from agent builder',
        count: 5,
      });
    });

    it('returns alerts_context_count as null for non-ES|QL custom workflow', () => {
      const result = extractPipelineAlertData({
        apiConfig,
        execution: customWorkflowGenericExecution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts_context_count).toBeNull();
    });

    it('returns null alerts_context_count for a plain string array output', () => {
      const execution: WorkflowExecutionDto = {
        stepExecutions: [
          {
            output: ['some-alert-1', 'some-alert-2'],
            stepId: 'agent_step',
            stepType: 'custom.agent_builder',
          },
        ],
        status: 'completed',
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineAlertData({
        apiConfig,
        execution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts_context_count).toBeNull();
    });
  });

  describe('error handling', () => {
    it('throws when the execution status is failed', () => {
      const execution: WorkflowExecutionDto = {
        ...customWorkflowGenericExecution,
        error: { message: 'Something went wrong' },
        status: 'failed',
      } as unknown as WorkflowExecutionDto;

      expect(() =>
        extractPipelineAlertData({
          apiConfig,
          execution,
          workflowId,
          workflowRunId,
        })
      ).toThrow();
    });

    it('throws when the execution status is cancelled', () => {
      const execution: WorkflowExecutionDto = {
        ...customWorkflowGenericExecution,
        status: 'cancelled',
      } as unknown as WorkflowExecutionDto;

      expect(() =>
        extractPipelineAlertData({
          apiConfig,
          execution,
          workflowId,
          workflowRunId,
        })
      ).toThrow();
    });

    it('throws when the execution status is timed_out', () => {
      const execution: WorkflowExecutionDto = {
        ...customWorkflowGenericExecution,
        status: 'timed_out',
      } as unknown as WorkflowExecutionDto;

      expect(() =>
        extractPipelineAlertData({
          apiConfig,
          execution,
          workflowId,
          workflowRunId,
        })
      ).toThrow();
    });

    it('throws for failed default workflow execution', () => {
      const execution: WorkflowExecutionDto = {
        ...defaultEsqlExecution,
        error: { message: 'Default workflow failed' },
        status: 'failed',
      } as unknown as WorkflowExecutionDto;

      expect(() =>
        extractPipelineAlertData({
          apiConfig,
          execution,
          workflowId,
          workflowRunId,
        })
      ).toThrow();
    });
  });

  describe('empty step output', () => {
    it('returns empty alerts for an execution with no step executions', () => {
      const execution: WorkflowExecutionDto = {
        stepExecutions: [],
        status: 'completed',
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineAlertData({
        apiConfig,
        execution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts).toEqual([]);
    });

    it('returns custom_workflow strategy for an execution with no step executions', () => {
      const execution: WorkflowExecutionDto = {
        stepExecutions: [],
        status: 'completed',
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineAlertData({
        apiConfig,
        execution,
        workflowId,
        workflowRunId,
      });

      expect(result.extraction_strategy).toBe('custom_workflow');
    });

    it('returns 0 alerts_context_count for an execution with no step executions', () => {
      const execution: WorkflowExecutionDto = {
        stepExecutions: [],
        status: 'completed',
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineAlertData({
        apiConfig,
        execution,
        workflowId,
        workflowRunId,
      });

      expect(result.alerts_context_count).toBe(0);
    });

    it('returns empty alerts and 0 count when all steps have null output (generic strategy)', () => {
      const execution: WorkflowExecutionDto = {
        stepExecutions: [
          { output: null, stepId: 'step_1', stepType: 'custom.first' },
          { output: null, stepId: 'step_2', stepType: 'custom.second' },
        ],
        status: 'completed',
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineAlertData({
        apiConfig,
        execution,
        workflowId,
        workflowRunId,
      });

      expect(result).toEqual({
        alerts: [],
        alerts_context_count: 0,
        extraction_strategy: 'custom_workflow',
      });
    });

    it('skips the trigger step and selects the last non-trigger step with output', () => {
      const execution: WorkflowExecutionDto = {
        stepExecutions: [
          {
            output: {
              columns: [{ name: '_id', type: 'keyword' }],
              values: [['alert-1']],
            },
            stepId: 'query_alerts',
            stepType: 'elasticsearch.esql.query',
          },
          {
            output: { trigger_data: 'metadata' },
            stepId: 'trigger',
            stepType: 'trigger',
          },
        ],
        status: 'completed',
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineAlertData({
        apiConfig,
        execution,
        workflowId,
        workflowRunId,
      });

      expect(result.extraction_strategy).toBe('custom_workflow');
    });
  });
});
