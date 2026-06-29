/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { AttackDiscoveryApiAlert } from '@kbn/discoveries-schemas';

import { getPersistedOutputDiscoveries } from '.';

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

describe('getPersistedOutputDiscoveries', () => {
  it('returns null when execution is null', () => {
    const result = getPersistedOutputDiscoveries({ execution: null });

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

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step has no output', () => {
    const execution = {
      stepExecutions: [
        {
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step output is null', () => {
    const execution = {
      stepExecutions: [
        {
          output: null,
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persisted_discoveries is not an array', () => {
    const execution = {
      stepExecutions: [
        {
          output: { persisted_discoveries: 'not-an-array' },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persisted_discoveries is null', () => {
    const execution = {
      stepExecutions: [
        {
          output: { duplicates_dropped_count: 0, persisted_discoveries: null },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns null when persist step output has no persisted_discoveries field', () => {
    const execution = {
      stepExecutions: [
        {
          output: { duplicates_dropped_count: 1 },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toBeNull();
  });

  it('returns the persisted discoveries when present', () => {
    const execution = {
      stepExecutions: [
        {
          output: {
            duplicates_dropped_count: 0,
            persisted_discoveries: [mockDiscovery, mockDiscoveryTwo],
          },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });

  it('returns empty array when persisted_discoveries is empty (all deduplicated away)', () => {
    const execution = {
      stepExecutions: [
        {
          output: { duplicates_dropped_count: 2, persisted_discoveries: [] },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toEqual([]);
  });

  it('returns persisted discoveries when persist step is among multiple steps', () => {
    const execution = {
      stepExecutions: [
        {
          output: { validated_discoveries: [mockDiscovery, mockDiscoveryTwo] },
          stepType: 'security.attack-discovery.defaultValidation',
        },
        {
          output: {
            duplicates_dropped_count: 1,
            persisted_discoveries: [mockDiscovery, mockDiscoveryTwo],
          },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    // persisted_discoveries holds existing + new (length 2); one is a pre-existing
    // duplicate, so the net-new count is 1.
    expect(result).toHaveLength(1);
  });

  it('subtracts duplicates_dropped_count so the result reflects only the net-new (stored) discoveries', () => {
    // Real-world scenario: validateAttackDiscoveries queries back the pre-existing
    // duplicates PLUS the newly-created discoveries, so `persisted_discoveries`
    // contains 8 (5 pre-existing + 3 new). The badge must reflect the 3 truly-new
    // (stored) discoveries, NOT the full re-queried set.
    const persistedDiscoveries = Array.from({ length: 8 }, (_, idx) => ({
      ...mockDiscovery,
      id: `discovery-${idx}`,
    }));

    const execution = {
      stepExecutions: [
        {
          output: {
            duplicates_dropped_count: 5,
            persisted_discoveries: persistedDiscoveries,
          },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result).toHaveLength(3);
  });
});
