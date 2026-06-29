/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import { extractGateDecision } from '.';

const baseCompletedExecution: WorkflowExecutionDto = {
  status: 'completed',
  stepExecutions: [
    {
      output: {
        conversation_id: 'conversation-1',
        message: 'gate decision',
        structured_output: {
          added_alert_ids: ['added-1', 'added-2'],
          additional_context: 'High-risk host; entity-analytics corroboration',
          keep_alert_ids: ['id-1', 'id-2'],
        },
      },
      stepId: 'gate',
      stepType: 'ai.agent',
    },
  ],
  workflowId: 'system-attack-discovery-skill-alert-retrieval',
} as unknown as WorkflowExecutionDto;

describe('extractGateDecision', () => {
  it('returns the keep_alert_ids from the structured_output', () => {
    const result = extractGateDecision({ execution: baseCompletedExecution });

    expect(result.keepAlertIds).toEqual(['id-1', 'id-2']);
  });

  it('returns the added_alert_ids from the structured_output', () => {
    const result = extractGateDecision({ execution: baseCompletedExecution });

    expect(result.addedAlertIds).toEqual(['added-1', 'added-2']);
  });

  it('returns the corroboration additionalContext from the structured_output', () => {
    const result = extractGateDecision({ execution: baseCompletedExecution });

    expect(result.additionalContext).toBe('High-risk host; entity-analytics corroboration');
  });

  it('returns the persisted conversationId', () => {
    const result = extractGateDecision({ execution: baseCompletedExecution });

    expect(result.conversationId).toBe('conversation-1');
  });

  it('defaults keepAlertIds to an empty array when absent', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { added_alert_ids: ['added-1'] } },
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractGateDecision({ execution });

    expect(result.keepAlertIds).toEqual([]);
  });

  it('defaults addedAlertIds to an empty array when absent', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { keep_alert_ids: ['id-1'] } },
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractGateDecision({ execution });

    expect(result.addedAlertIds).toEqual([]);
  });

  it('omits additionalContext when the structured_output has none', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { keep_alert_ids: ['id-1'] } },
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractGateDecision({ execution });

    expect(result.additionalContext).toBeUndefined();
  });

  it('omits additionalContext when it is whitespace-only', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { additional_context: '   ', keep_alert_ids: ['id-1'] } },
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractGateDecision({ execution });

    expect(result.additionalContext).toBeUndefined();
  });

  it('parses the decision when structured_output is a JSON string', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: {
            conversation_id: 'conversation-1',
            structured_output: JSON.stringify({ keep_alert_ids: ['parsed-id'] }),
          },
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractGateDecision({ execution });

    expect(result.keepAlertIds).toEqual(['parsed-id']);
  });

  it('returns an empty keep-set when structured_output is empty', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: {} },
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractGateDecision({ execution });

    expect(result.keepAlertIds).toEqual([]);
  });

  it('throws an AttackDiscoveryError when the execution failed', () => {
    const execution = {
      ...baseCompletedExecution,
      error: { message: 'boom' },
      status: 'failed',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractGateDecision({ execution })).toThrow(AttackDiscoveryError);
  });

  it('throws when the execution was cancelled', () => {
    const execution = {
      ...baseCompletedExecution,
      status: 'cancelled',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractGateDecision({ execution })).toThrow(AttackDiscoveryError);
  });

  it('throws when the execution timed out', () => {
    const execution = {
      ...baseCompletedExecution,
      status: 'timed_out',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractGateDecision({ execution })).toThrow(AttackDiscoveryError);
  });

  it('throws when the ai.agent step is not found', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [],
    } as unknown as WorkflowExecutionDto;

    expect(() => extractGateDecision({ execution })).toThrow(
      'Gate agent step not found in gate workflow execution'
    );
  });

  it('throws when the ai.agent step has no output', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: undefined,
          stepId: 'gate',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    expect(() => extractGateDecision({ execution })).toThrow(
      'Gate agent step completed but returned no decision output'
    );
  });
});
