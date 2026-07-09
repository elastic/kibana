/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { getValidationStepDiscoveries } from '.';

const mockDiscovery: AttackDiscoveryApiAlert = {
  alert_ids: ['alert-1'],
  connector_id: 'connector-id',
  connector_name: 'Test Connector',
  details_markdown: '## Details',
  generation_uuid: 'gen-uuid-1',
  id: 'discovery-1',
  summary_markdown: 'Summary',
  timestamp: '2026-02-13T00:00:00.000Z',
  title: 'Discovery One',
};

const mockDiscoveryTwo: AttackDiscoveryApiAlert = {
  alert_ids: ['alert-2'],
  connector_id: 'connector-id',
  connector_name: 'Test Connector',
  details_markdown: '## Details Two',
  generation_uuid: 'gen-uuid-1',
  id: 'discovery-2',
  summary_markdown: 'Summary Two',
  timestamp: '2026-02-13T01:00:00.000Z',
  title: 'Discovery Two',
};

const baseExecution = {
  stepExecutions: [
    {
      output: { validated_discoveries: [mockDiscovery, mockDiscoveryTwo] },
      stepType: 'security.attack-discovery.defaultValidation',
    },
  ],
} as unknown as WorkflowExecutionDto;

describe('getValidationStepDiscoveries', () => {
  it('returns null when execution is null', () => {
    const result = getValidationStepDiscoveries({ execution: null });

    expect(result).toBeNull();
  });

  it('returns null when validation step is not found', () => {
    const execution = {
      stepExecutions: [
        {
          output: { persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when validation step has no output', () => {
    const execution = {
      stepExecutions: [
        {
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when validation step output is null', () => {
    const execution = {
      stepExecutions: [
        {
          output: null,
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when validated_discoveries is not an array', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: 'not-an-array' },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when validated_discoveries is missing from output', () => {
    const execution = {
      stepExecutions: [
        {
          output: { other_field: 'value' },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns all validated_discoveries when no persist step is present', () => {
    const result = getValidationStepDiscoveries({ execution: baseExecution });

    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });

  it('returns all validated_discoveries when persist step has no duplicates_dropped_count', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery, mockDiscoveryTwo] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        {
          output: { persisted_discoveries: [mockDiscovery, mockDiscoveryTwo] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });

  it('subtracts duplicates_dropped_count from validated_discoveries', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery, mockDiscoveryTwo] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        {
          output: { duplicates_dropped_count: 1, persisted_discoveries: [mockDiscovery] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toHaveLength(1);
    expect(result?.[0]).toEqual(mockDiscovery);
  });

  it('returns empty array when all validated_discoveries are duplicates', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        {
          output: { duplicates_dropped_count: 1, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toEqual([]);
  });

  it('clamps to empty array when duplicates_dropped_count exceeds validated_discoveries length', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        {
          output: { duplicates_dropped_count: 5, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toEqual([]);
  });

  it('returns all validated_discoveries when duplicates_dropped_count is 0', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery, mockDiscoveryTwo] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        {
          output: {
            duplicates_dropped_count: 0,
            persisted_discoveries: [mockDiscovery, mockDiscoveryTwo],
          },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });

  it('returns empty array when validated_discoveries is empty', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getValidationStepDiscoveries({ execution });

    expect(result).toEqual([]);
  });
});
