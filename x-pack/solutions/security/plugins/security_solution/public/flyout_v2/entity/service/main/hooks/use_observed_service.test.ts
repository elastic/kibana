/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useObservedService } from './use_observed_service';
import { useObservedServiceDetails } from './observed_service_details';
import { useFirstLastSeen } from '../../../../../common/containers/use_first_last_seen';
import type { EntityFromStoreResult } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { ServiceItem } from '../../../../../../common/search_strategy';

jest.mock('./observed_service_details', () => ({
  useObservedServiceDetails: jest.fn(),
}));
jest.mock('@kbn/entity-store/public', () => ({
  useEntityStoreEuidApi: jest.fn(),
}));
jest.mock('../../../../../common/containers/use_first_last_seen', () => ({
  useFirstLastSeen: jest.fn(() => [false, { firstSeen: 'events-first', lastSeen: 'events-last' }]),
}));
jest.mock('../../../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(() => ({
    to: '2024-02-01T00:00:00.000Z',
    from: '2024-01-01T00:00:00.000Z',
    isInitializing: false,
    setQuery: jest.fn(),
    deleteQuery: jest.fn(),
  })),
}));
jest.mock('../../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(() => ({ to: '', from: '' })),
}));
jest.mock('../../../../../common/components/page/manage_query', () => ({
  useQueryInspector: jest.fn(),
}));
jest.mock('../../../../../data_view_manager/hooks/use_security_default_patterns', () => ({
  useSecurityDefaultPatterns: jest.fn(() => ({ indexPatterns: ['logs-*'] })),
}));

const mockUseObservedServiceDetails = useObservedServiceDetails as jest.Mock;
const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;
const mockUseEntityStoreEuidApi = useEntityStoreEuidApi as jest.Mock;

const targetRecord = {
  entity: {
    id: 'service:target',
    lifecycle: { first_seen: '2024-01-10T00:00:00.000Z', last_seen: '2024-01-20T00:00:00.000Z' },
  },
  service: { name: 'target', environment: 'production' },
} as never;

const aliasRecord = {
  entity: {
    id: 'service:alias',
    lifecycle: { first_seen: '2024-01-05T00:00:00.000Z', last_seen: '2024-01-25T00:00:00.000Z' },
  },
  service: { name: 'alias', environment: 'staging' },
} as never;

const buildStoreResult = (
  overrides: Partial<EntityFromStoreResult<ServiceItem>> = {}
): EntityFromStoreResult<ServiceItem> =>
  ({
    entity: null,
    entityRecord: targetRecord,
    aliasRecords: [],
    aliasCount: 0,
    firstSeen: '2024-01-10T00:00:00.000Z',
    lastSeen: '2024-01-20T00:00:00.000Z',
    isLoading: false,
    isInitialLoading: false,
    error: null,
    inspect: undefined,
    refetch: jest.fn(),
    ...overrides,
  } as unknown as EntityFromStoreResult<ServiceItem>);

const getEuidFilterBasedOnEntityRecord = jest.fn(
  (_definition: unknown, record: { entity: { id: string } }) => ({
    term: { 'entity.id': record.entity.id },
  })
);

describe('useObservedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseObservedServiceDetails.mockReturnValue([
      false,
      {
        serviceDetails: { service: { version: ['1.0.0'] } },
        inspect: null,
        refetch: jest.fn(),
        id: 'observedServiceDetailsQuery',
      },
    ]);
    mockUseEntityStoreEuidApi.mockReturnValue({
      euid: { dsl: { getEuidFilterBasedOnEntityRecord } },
      getBuiltInEntityDefinition: () => ({}),
    });
  });

  it('queries by service name and reads first/last seen from events without a store result', () => {
    const { result } = renderHook(() => useObservedService('target', ''));

    expect(mockUseObservedServiceDetails).toHaveBeenCalledWith(
      expect.objectContaining({ serviceName: 'target', filterQuery: undefined })
    );
    expect(mockUseFirstLastSeen).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'service.name', value: 'target', skip: false })
    );
    expect(result.current.firstSeen.date).toBe('events-first');
    expect(result.current.lastSeen.date).toBe('events-last');
    expect(result.current.entityRecord).toBeUndefined();
  });

  it('scopes the observed query by the record identity and merges the record outside the group view', () => {
    const { result } = renderHook(() => useObservedService('target', '', buildStoreResult()));

    expect(mockUseObservedServiceDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({ term: { 'entity.id': 'service:target' } }),
      })
    );
    expect(mockUseFirstLastSeen).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
    expect(result.current.details.service?.environment).toBe('production');
    expect(result.current.details.service?.version).toEqual(['1.0.0']);
    expect(result.current.firstSeen.date).toBe('2024-01-10T00:00:00.000Z');
    expect(result.current.lastSeen.date).toBe('2024-01-20T00:00:00.000Z');
    expect(result.current.entityRecord).toBe(targetRecord);
  });

  it('covers the aliases and spans first/last seen across the group in the group view', () => {
    const { result } = renderHook(() =>
      useObservedService('target', '', buildStoreResult({ aliasRecords: [aliasRecord] }))
    );

    expect(getEuidFilterBasedOnEntityRecord).toHaveBeenCalledWith(expect.anything(), aliasRecord);
    expect(result.current.details.service?.environment).toEqual(['production', 'staging']);
    expect(result.current.firstSeen.date).toBe('2024-01-05T00:00:00.000Z');
    expect(result.current.lastSeen.date).toBe('2024-01-25T00:00:00.000Z');
  });

  it('skips the observed query while the store record is still resolving', () => {
    renderHook(() =>
      useObservedService(
        'target',
        '',
        buildStoreResult({ entityRecord: null, isLoading: true, isInitialLoading: true })
      )
    );

    expect(mockUseObservedServiceDetails).toHaveBeenCalledWith(
      expect.objectContaining({ skip: true })
    );
  });

  it('queries over the pinned time range when opened from the new Entity Analytics home', () => {
    renderHook(() =>
      useObservedService('target', 'entity-analytics-new-entities-table-7d', buildStoreResult())
    );

    expect(mockUseObservedServiceDetails).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: 'now-7d', endDate: 'now' })
    );
  });
});
