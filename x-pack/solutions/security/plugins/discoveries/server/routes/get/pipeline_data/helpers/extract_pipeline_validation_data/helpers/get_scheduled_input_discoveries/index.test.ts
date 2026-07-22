/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { getScheduledInputDiscoveries } from '.';

const mockDiscovery: AttackDiscoveryApiAlert = {
  alert_ids: ['alert-1'],
  connector_id: 'connector-id',
  connector_name: 'Test Connector',
  details_markdown: '## Details',
  generation_uuid: 'gen-uuid-1',
  id: 'discovery-1',
  summary_markdown: 'Summary',
  timestamp: '2026-02-13T00:00:00.000Z',
  title: 'DISCOVERY ONE',
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
  title: 'DISCOVERY TWO',
};

const scheduledPersistStep = {
  input: {
    attack_discoveries: [mockDiscovery, mockDiscoveryTwo],
    source: 'scheduled',
  },
  output: {
    duplicates_dropped_count: 0,
    persisted_discoveries: [],
  },
  stepType: 'security.attack-discovery.persistDiscoveries',
};

describe('getScheduledInputDiscoveries', () => {
  it('returns null when execution is null', () => {
    const result = getScheduledInputDiscoveries({ execution: null });

    expect(result).toBeNull();
  });

  it('returns null when persist step is not found', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step has no input', () => {
    const execution = {
      stepExecutions: [
        {
          output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step input source is not scheduled', () => {
    const execution = {
      stepExecutions: [
        {
          input: { attack_discoveries: [mockDiscovery], source: 'interactive' },
          output: { duplicates_dropped_count: 0, persisted_discoveries: [mockDiscovery] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step input source is scheduled but attack_discoveries is not an array', () => {
    const execution = {
      stepExecutions: [
        {
          input: { attack_discoveries: 'not-an-array', source: 'scheduled' },
          output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step input source is scheduled but attack_discoveries is missing', () => {
    const execution = {
      stepExecutions: [
        {
          input: { source: 'scheduled' },
          output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns the attack_discoveries from persist step input when source is scheduled', () => {
    const execution = {
      stepExecutions: [scheduledPersistStep],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });

  it('returns empty array when source is scheduled and attack_discoveries is empty', () => {
    const execution = {
      stepExecutions: [
        {
          input: { attack_discoveries: [], source: 'scheduled' },
          output: { duplicates_dropped_count: 0, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toEqual([]);
  });

  it('returns discoveries when persist step is among multiple steps', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        scheduledPersistStep,
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getScheduledInputDiscoveries({ execution });

    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });
});
