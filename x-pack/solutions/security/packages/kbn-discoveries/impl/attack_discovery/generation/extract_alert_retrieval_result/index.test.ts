/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { extractAlertRetrievalResult } from '.';

describe('extractAlertRetrievalResult', () => {
  const apiConfig = {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  };

  const baseExecution: WorkflowExecutionDto = {
    stepExecutions: [
      {
        output: {
          alerts: ['a1'],
          alerts_context_count: 1,
          anonymized_alerts: [{ metadata: {}, page_content: 'a1' }],
          api_config: apiConfig,
          connector_name: 'Test Connector',
          replacements: { u1: 'REDACTED_U1' },
        },
        stepType: 'attack-discovery.defaultAlertRetrieval',
      },
    ],
    status: 'completed',
  } as unknown as WorkflowExecutionDto;

  it('returns alerts', () => {
    const result = extractAlertRetrievalResult({
      apiConfig,
      execution: baseExecution,
    });

    expect(result.alerts).toEqual(['a1']);
  });

  it('throws when execution is failed', () => {
    const execution = {
      ...baseExecution,
      error: { message: 'boom' },
      status: 'failed',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractAlertRetrievalResult({ apiConfig, execution })).toThrow(
      'Alert retrieval workflow failed: boom'
    );
  });

  it('throws when execution is cancelled', () => {
    const execution = { ...baseExecution, status: 'cancelled' } as unknown as WorkflowExecutionDto;

    expect(() => extractAlertRetrievalResult({ apiConfig, execution })).toThrow(
      'Alert retrieval workflow was cancelled. This may indicate a concurrent execution or manual cancellation. Retry generation.'
    );
  });

  it('throws when execution is timed_out', () => {
    const execution = { ...baseExecution, status: 'timed_out' } as unknown as WorkflowExecutionDto;

    expect(() => extractAlertRetrievalResult({ apiConfig, execution })).toThrow(
      'Alert retrieval workflow timed out. Consider increasing the workflow timeout or reducing the alert count.'
    );
  });

  it('throws when alert retrieval step is missing', () => {
    const execution = { ...baseExecution, stepExecutions: [] } as unknown as WorkflowExecutionDto;

    expect(() => extractAlertRetrievalResult({ apiConfig, execution })).toThrow(
      'Alert retrieval step not found in workflow execution'
    );
  });

  it('throws when alert retrieval step has no output', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [{ stepType: 'attack-discovery.defaultAlertRetrieval' }],
    } as unknown as WorkflowExecutionDto;

    expect(() => extractAlertRetrievalResult({ apiConfig, execution })).toThrow(
      'Alert retrieval step completed but returned no alerts. Check the time range, filter, and alerts index configuration.'
    );
  });

  it('parses api_config when it is a string', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          ...baseExecution.stepExecutions[0],
          output: {
            ...(baseExecution.stepExecutions[0] as { output: Record<string, unknown> }).output,
            api_config: JSON.stringify({
              action_type_id: '.bedrock',
              connector_id: 'other',
              model: 'claude-v2',
            }),
          },
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractAlertRetrievalResult({ apiConfig, execution });

    expect(result.apiConfig).toEqual({
      action_type_id: '.bedrock',
      connector_id: 'other',
      model: 'claude-v2',
    });
  });

  it('uses provided apiConfig when api_config string is invalid JSON', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          ...baseExecution.stepExecutions[0],
          output: {
            ...(baseExecution.stepExecutions[0] as { output: Record<string, unknown> }).output,
            api_config: '{not json}',
          },
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractAlertRetrievalResult({ apiConfig, execution });

    expect(result.apiConfig).toEqual(apiConfig);
  });

  it('defaults missing output fields', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: {},
          stepType: 'attack-discovery.defaultAlertRetrieval',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractAlertRetrievalResult({ apiConfig, execution });

    expect(result.alerts).toEqual([]);
  });
});
