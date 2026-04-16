/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { extractPipelineValidationData } from '.';

const mockValidatedDiscovery: AttackDiscoveryApiAlert = {
  alert_ids: ['alert-1', 'alert-2'],
  connector_id: 'test-connector-id',
  connector_name: 'Test Connector',
  details_markdown: '## Attack Details\n- Suspicious activity detected',
  generation_uuid: 'gen-uuid-1',
  id: 'discovery-1',
  summary_markdown: 'A suspicious attack was detected',
  timestamp: '2026-02-13T00:00:00.000Z',
  title: 'Suspicious Activity Detected',
};

const mockValidatedDiscoveryTwo: AttackDiscoveryApiAlert = {
  alert_ids: ['alert-3'],
  connector_id: 'test-connector-id',
  connector_name: 'Test Connector',
  details_markdown: '## Lateral Movement\n- User moved between hosts',
  generation_uuid: 'gen-uuid-1',
  id: 'discovery-2',
  summary_markdown: 'Lateral movement detected',
  timestamp: '2026-02-13T01:00:00.000Z',
  title: 'Lateral Movement',
};

const baseExecution: WorkflowExecutionDto = {
  status: 'completed',
  stepExecutions: [
    {
      output: {
        validated_discoveries: [mockValidatedDiscovery, mockValidatedDiscoveryTwo],
      },
      stepType: 'security.attack-discovery.defaultValidation',
    },
  ],
} as unknown as WorkflowExecutionDto;

describe('extractPipelineValidationData', () => {
  it('returns validated discoveries when the validation step has output', () => {
    const result = extractPipelineValidationData({ execution: baseExecution });

    expect(result).toEqual([mockValidatedDiscovery, mockValidatedDiscoveryTwo]);
  });

  it('returns a single validated discovery when only one is present', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: {
            validated_discoveries: [mockValidatedDiscovery],
          },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toEqual([mockValidatedDiscovery]);
  });

  it('returns an empty array when validated_discoveries is empty', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: {
            validated_discoveries: [],
          },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toEqual([]);
  });

  it('returns null when execution is null', () => {
    const result = extractPipelineValidationData({ execution: null });

    expect(result).toBeNull();
  });

  it('returns null when the validation step is not found in step executions', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: { some_data: 'value' },
          stepType: 'security.attack-discovery.defaultAlertRetrieval',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toBeNull();
  });

  it('returns null when step executions is empty', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toBeNull();
  });

  it('returns null when the validation step has no output', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toBeNull();
  });

  it('returns null when the validation step output is null', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: null,
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toBeNull();
  });

  it('returns null when validated_discoveries is not an array', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: {
            validated_discoveries: 'not-an-array',
          },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toBeNull();
  });

  it('returns null when output does not contain validated_discoveries', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: {
            other_field: 'some-value',
          },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toBeNull();
  });

  it('selects the validation step when multiple steps exist', () => {
    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: { alerts: ['a1'] },
          stepType: 'security.attack-discovery.defaultAlertRetrieval',
        },
        {
          output: { attack_discoveries: [] },
          stepType: 'security.attack-discovery.generate',
        },
        {
          output: {
            validated_discoveries: [mockValidatedDiscovery],
          },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toEqual([mockValidatedDiscovery]);
  });

  describe('deduplication accounting via persist step', () => {
    it('subtracts duplicates_dropped_count from validated_discoveries when there are duplicates', () => {
      const execution = {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              validated_discoveries: [mockValidatedDiscovery, mockValidatedDiscoveryTwo],
            },
            stepType: 'security.attack-discovery.defaultValidation',
          },
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [mockValidatedDiscovery],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineValidationData({ execution });

      expect(result).toHaveLength(1);
    });

    it('returns empty array when all validated_discoveries are duplicates', () => {
      const execution = {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              validated_discoveries: [mockValidatedDiscovery],
            },
            stepType: 'security.attack-discovery.defaultValidation',
          },
          {
            output: {
              duplicates_dropped_count: 1,
              persisted_discoveries: [],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineValidationData({ execution });

      expect(result).toEqual([]);
    });

    it('returns all validated_discoveries when duplicates_dropped_count is 0', () => {
      const execution = {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              validated_discoveries: [mockValidatedDiscovery, mockValidatedDiscoveryTwo],
            },
            stepType: 'security.attack-discovery.defaultValidation',
          },
          {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [mockValidatedDiscovery, mockValidatedDiscoveryTwo],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineValidationData({ execution });

      expect(result).toEqual([mockValidatedDiscovery, mockValidatedDiscoveryTwo]);
    });

    it('clamps to empty array when duplicates_dropped_count exceeds validated_discoveries length', () => {
      const execution = {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              validated_discoveries: [mockValidatedDiscovery],
            },
            stepType: 'security.attack-discovery.defaultValidation',
          },
          {
            output: {
              duplicates_dropped_count: 5,
              persisted_discoveries: [],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineValidationData({ execution });

      expect(result).toEqual([]);
    });

    it('returns all validated_discoveries when persist step output has no duplicates_dropped_count', () => {
      const execution = {
        ...baseExecution,
        stepExecutions: [
          {
            output: {
              validated_discoveries: [mockValidatedDiscovery],
            },
            stepType: 'security.attack-discovery.defaultValidation',
          },
          {
            output: {
              persisted_discoveries: [mockValidatedDiscovery],
            },
            stepType: 'security.attack-discovery.persistDiscoveries',
          },
        ],
      } as unknown as WorkflowExecutionDto;

      const result = extractPipelineValidationData({ execution });

      expect(result).toEqual([mockValidatedDiscovery]);
    });

    it('returns all validated_discoveries when persist step is not present', () => {
      const result = extractPipelineValidationData({ execution: baseExecution });

      expect(result).toEqual([mockValidatedDiscovery, mockValidatedDiscoveryTwo]);
    });
  });

  it('preserves optional fields on validated discoveries', () => {
    const discoveryWithOptionalFields: AttackDiscoveryApiAlert = {
      ...mockValidatedDiscovery,
      alert_rule_uuid: 'rule-uuid-1',
      alert_workflow_status: 'open',
      entity_summary_markdown: 'host.name: {{host.name}}',
      mitre_attack_tactics: ['Initial Access', 'Execution'],
      replacements: { 'host.name': 'REDACTED_HOST' },
      risk_score: 85,
      user_id: 'user-1',
      user_name: 'elastic',
    };

    const execution = {
      ...baseExecution,
      stepExecutions: [
        {
          output: {
            validated_discoveries: [discoveryWithOptionalFields],
          },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = extractPipelineValidationData({ execution });

    expect(result).toEqual([discoveryWithOptionalFields]);
  });
});
