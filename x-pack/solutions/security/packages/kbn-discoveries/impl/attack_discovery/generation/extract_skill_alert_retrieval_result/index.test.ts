/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { AttackDiscoveryError } from '../../../lib/errors/attack_discovery_error';
import { extractSkillAlertRetrievalResult } from '.';

const baseCompletedExecution: WorkflowExecutionDto = {
  status: 'completed',
  stepExecutions: [
    {
      output: {
        conversation_id: 'conversation-1',
        message: 'curated alerts',
        structured_output: {
          additional_context: 'High-risk host; entity-analytics corroboration',
          alert_count: 2,
          alert_ids: ['id-1', 'id-2'],
          alerts: ['skill-alert-1', 'skill-alert-2'],
        },
      },
      stepId: 'retrieve_alerts',
      stepType: 'ai.agent',
    },
  ],
  workflowId: 'system-attack-discovery-skill-alert-retrieval',
} as unknown as WorkflowExecutionDto;

describe('extractSkillAlertRetrievalResult', () => {
  it('surfaces the curated alert_ids from the structured_output', () => {
    const result = extractSkillAlertRetrievalResult({ execution: baseCompletedExecution });

    expect(result.alertIds).toEqual(['id-1', 'id-2']);
  });

  it('falls back to the alert_ids length for alertsContextCount when alert_count is absent', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { alert_ids: ['id-1', 'id-2', 'id-3'] } },
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractSkillAlertRetrievalResult({ execution });

    expect(result.alertsContextCount).toBe(3);
  });

  it('returns the curated alerts from the structured_output with the backing _id embedded', () => {
    const result = extractSkillAlertRetrievalResult({ execution: baseCompletedExecution });

    expect(result.alerts).toEqual(['_id,id-1\nskill-alert-1', '_id,id-2\nskill-alert-2']);
  });

  it('leaves alerts unchanged when they already embed their backing _id', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: {
            structured_output: {
              alert_count: 2,
              alert_ids: ['id-1', 'id-2'],
              alerts: ['_id,id-1\nskill-alert-1', '_id,id-2\nskill-alert-2'],
            },
          },
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractSkillAlertRetrievalResult({ execution });

    expect(result.alerts).toEqual(['_id,id-1\nskill-alert-1', '_id,id-2\nskill-alert-2']);
  });

  it('returns alert_count as alertsContextCount', () => {
    const result = extractSkillAlertRetrievalResult({ execution: baseCompletedExecution });

    expect(result.alertsContextCount).toBe(2);
  });

  it('returns the persisted conversationId', () => {
    const result = extractSkillAlertRetrievalResult({ execution: baseCompletedExecution });

    expect(result.conversationId).toBe('conversation-1');
  });

  it('returns the corroboration additionalContext from the structured_output', () => {
    const result = extractSkillAlertRetrievalResult({ execution: baseCompletedExecution });

    expect(result.additionalContext).toBe('High-risk host; entity-analytics corroboration');
  });

  it('omits additionalContext when the structured_output has none', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { alerts: ['only-one'] } },
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractSkillAlertRetrievalResult({ execution });

    expect(result.additionalContext).toBeUndefined();
  });

  it('falls back to alerts length when alert_count is absent', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: { alerts: ['only-one'] } },
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractSkillAlertRetrievalResult({ execution });

    expect(result.alertsContextCount).toBe(1);
  });

  it('parses the alerts when structured_output is a JSON string', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: {
            conversation_id: 'conversation-1',
            structured_output: JSON.stringify({ alert_count: 1, alerts: ['parsed-alert'] }),
          },
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractSkillAlertRetrievalResult({ execution });

    expect(result.alerts).toEqual(['parsed-alert']);
  });

  it('returns empty alerts when structured_output has no alerts', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: { structured_output: {} },
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractSkillAlertRetrievalResult({ execution });

    expect(result.alerts).toEqual([]);
  });

  it('throws an AttackDiscoveryError when the execution failed', () => {
    const execution = {
      ...baseCompletedExecution,
      error: { message: 'boom' },
      status: 'failed',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractSkillAlertRetrievalResult({ execution })).toThrow(AttackDiscoveryError);
  });

  it('throws when the execution was cancelled', () => {
    const execution = {
      ...baseCompletedExecution,
      status: 'cancelled',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractSkillAlertRetrievalResult({ execution })).toThrow(AttackDiscoveryError);
  });

  it('throws when the execution timed out', () => {
    const execution = {
      ...baseCompletedExecution,
      status: 'timed_out',
    } as unknown as WorkflowExecutionDto;

    expect(() => extractSkillAlertRetrievalResult({ execution })).toThrow(AttackDiscoveryError);
  });

  it('throws when the ai.agent step is not found', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [],
    } as unknown as WorkflowExecutionDto;

    expect(() => extractSkillAlertRetrievalResult({ execution })).toThrow(
      'Skill agent step not found in skill alert retrieval workflow execution'
    );
  });

  it('throws when the ai.agent step has no output', () => {
    const execution = {
      ...baseCompletedExecution,
      stepExecutions: [
        {
          output: undefined,
          stepId: 'retrieve_alerts',
          stepType: 'ai.agent',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    expect(() => extractSkillAlertRetrievalResult({ execution })).toThrow(
      'Skill agent step completed but returned no alerts. Check the time range and alerts index configuration.'
    );
  });
});
