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
            duplicates_dropped_count: 0,
            persisted_discoveries: [mockDiscovery, mockDiscoveryTwo],
          },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    // persisted_discoveries already contains only net-new discoveries.
    expect(result).toEqual([mockDiscovery, mockDiscoveryTwo]);
  });

  it('returns persisted_discoveries as-is (they are already the net-new set)', () => {
    // validateAttackDiscoveries drops duplicates on write and returns only the
    // genuinely-new discoveries, so no subtraction/slicing is applied here even
    // when duplicates_dropped_count is non-zero.
    const persistedDiscoveries = Array.from({ length: 3 }, (_, idx) => ({
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

    expect(result).toEqual(persistedDiscoveries);
  });

  it('surfaces the genuinely-new discovery regardless of its position in the array', () => {
    // Regression: previously a positional .slice() would drop the net-new
    // discovery whenever it did not appear first. The net-new discovery here is
    // last, but it must still be surfaced.
    const newDiscovery: AttackDiscoveryApiAlert = {
      ...mockDiscovery,
      id: 'net-new',
      title: 'NET NEW DISCOVERY',
    };

    const execution = {
      stepExecutions: [
        {
          output: {
            duplicates_dropped_count: 0,
            persisted_discoveries: [newDiscovery],
          },
          stepType: 'security.attack-discovery.persistDiscoveries',
        },
      ],
    } as unknown as WorkflowExecutionDto;

    const result = getPersistedOutputDiscoveries({ execution });

    expect(result?.map((discovery) => discovery.id)).toContain('net-new');
  });
});
