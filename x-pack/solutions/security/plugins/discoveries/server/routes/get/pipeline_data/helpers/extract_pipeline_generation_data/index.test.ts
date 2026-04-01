/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';

import { extractPipelineGenerationData } from '.';
import type { AttackDiscoveryOutput, PipelineGenerationData } from '.';

const mockAttackDiscovery: AttackDiscoveryOutput = {
  alert_ids: ['alert-1', 'alert-2'],
  details_markdown: '## Attack Details\n- Suspicious process detected',
  entity_summary_markdown: 'host.name: `web-server-01`',
  id: 'discovery-1',
  mitre_attack_tactics: ['Initial Access', 'Execution'],
  summary_markdown: 'A suspicious process was detected on web-server-01',
  timestamp: '2026-02-13T00:00:00.000Z',
  title: 'Suspicious Process Execution',
};

const mockReplacements: Record<string, string> = {
  abc123: 'web-server-01',
  def456: 'admin-user',
};

const baseExecution: WorkflowExecutionDto = {
  id: 'exec-1',
  spaceId: 'default',
  status: 'completed',
  stepExecutions: [],
} as unknown as WorkflowExecutionDto;

const generateStepOutput = {
  alerts_context_count: 5,
  attack_discoveries: [mockAttackDiscovery],
  execution_uuid: 'test-execution-uuid',
  replacements: mockReplacements,
};

const executionWithGenerateStep: WorkflowExecutionDto = {
  ...baseExecution,
  stepExecutions: [
    {
      output: { alerts: ['alert-data'], alerts_context_count: 5 },
      stepId: 'retrieve_alerts',
      stepType: 'attack-discovery.defaultAlertRetrieval',
    },
    {
      output: generateStepOutput,
      stepId: 'generate',
      stepType: 'attack-discovery.generate',
    },
  ],
} as unknown as WorkflowExecutionDto;

describe('extractPipelineGenerationData', () => {
  it('returns null when generationExecution is null', () => {
    const result = extractPipelineGenerationData({
      generationExecution: null,
    });

    expect(result).toBeNull();
  });

  it('returns null when the generate step is not found in step executions', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: { alerts: ['alert-data'] },
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result).toBeNull();
  });

  it('returns null when step executions is empty', () => {
    const result = extractPipelineGenerationData({
      generationExecution: baseExecution,
    });

    expect(result).toBeNull();
  });

  it('returns null when the generate step has no output', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: null,
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result).toBeNull();
  });

  it('returns null when the generate step output is undefined', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result).toBeNull();
  });

  it('extracts attack_discoveries from the generate step output', () => {
    const result = extractPipelineGenerationData({
      generationExecution: executionWithGenerateStep,
    });

    expect(result?.attack_discoveries).toEqual([mockAttackDiscovery]);
  });

  it('extracts execution_uuid from the generate step output', () => {
    const result = extractPipelineGenerationData({
      generationExecution: executionWithGenerateStep,
    });

    expect(result?.execution_uuid).toBe('test-execution-uuid');
  });

  it('extracts replacements as an object from the generate step output', () => {
    const result = extractPipelineGenerationData({
      generationExecution: executionWithGenerateStep,
    });

    expect(result?.replacements).toEqual(mockReplacements);
  });

  it('parses replacements when provided as a JSON string', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              ...generateStepOutput,
              replacements: JSON.stringify(mockReplacements),
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.replacements).toEqual(mockReplacements);
  });

  it('returns empty replacements when the replacements string is malformed JSON', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              ...generateStepOutput,
              replacements: 'not-valid-json{',
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.replacements).toEqual({});
  });

  it('returns empty replacements when replacements is not present in output', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              attack_discoveries: [mockAttackDiscovery],
              execution_uuid: 'test-uuid',
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.replacements).toEqual({});
  });

  it('extracts multiple attack discoveries', () => {
    const secondDiscovery: AttackDiscoveryOutput = {
      alert_ids: ['alert-3'],
      details_markdown: '## Second Attack\n- Lateral movement detected',
      summary_markdown: 'Lateral movement observed between hosts',
      title: 'Lateral Movement Detection',
    };

    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              ...generateStepOutput,
              attack_discoveries: [mockAttackDiscovery, secondDiscovery],
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.attack_discoveries).toHaveLength(2);
    expect(result?.attack_discoveries).toEqual([mockAttackDiscovery, secondDiscovery]);
  });

  it('returns empty attack_discoveries array when the output has no attack_discoveries', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              execution_uuid: 'test-uuid',
              replacements: {},
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.attack_discoveries).toEqual([]);
  });

  it('returns empty execution_uuid when the output has no execution_uuid', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              attack_discoveries: [mockAttackDiscovery],
              replacements: {},
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.execution_uuid).toBe('');
  });

  it('returns the complete PipelineGenerationData structure', () => {
    const result = extractPipelineGenerationData({
      generationExecution: executionWithGenerateStep,
    });

    const expected: PipelineGenerationData = {
      attack_discoveries: [mockAttackDiscovery],
      execution_uuid: 'test-execution-uuid',
      replacements: mockReplacements,
    };

    expect(result).toEqual(expected);
  });

  it('finds the generate step regardless of its position in step executions', () => {
    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: { trigger_data: 'something' },
            stepId: 'trigger',
            stepType: 'trigger',
          },
          {
            output: { alerts: ['alert-data'] },
            stepId: 'retrieve_alerts',
            stepType: 'attack-discovery.defaultAlertRetrieval',
          },
          {
            output: generateStepOutput,
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
          {
            output: { validated_discoveries: [] },
            stepId: 'validate_discoveries',
            stepType: 'attack-discovery.defaultValidation',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result).toEqual({
      attack_discoveries: [mockAttackDiscovery],
      execution_uuid: 'test-execution-uuid',
      replacements: mockReplacements,
    });
  });

  it('handles attack discoveries with only required fields', () => {
    const minimalDiscovery: AttackDiscoveryOutput = {
      alert_ids: ['alert-1'],
      details_markdown: 'Details',
      summary_markdown: 'Summary',
      title: 'Title',
    };

    const result = extractPipelineGenerationData({
      generationExecution: {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              attack_discoveries: [minimalDiscovery],
              execution_uuid: 'uuid-1',
              replacements: {},
            },
            stepId: 'generate',
            stepType: 'attack-discovery.generate',
          },
        ],
      } as unknown as WorkflowExecutionDto,
    });

    expect(result?.attack_discoveries).toEqual([minimalDiscovery]);
  });
});
