/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useObservedHost } from './use_observed_host';
import { useHostDetails } from '../../../../../explore/hosts/containers/hosts/details';
import { useFirstLastSeen } from '../../../../../common/containers/use_first_last_seen';
import type { EntityFromStoreResult } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { HostItem } from '../../../../../../common/search_strategy';

jest.mock('../../../../../explore/hosts/containers/hosts/details', () => ({
  useHostDetails: jest.fn(),
}));
jest.mock('../../../../../common/containers/use_first_last_seen', () => ({
  useFirstLastSeen: jest.fn(() => [false, { firstSeen: null, lastSeen: null }]),
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

const mockUseHostDetails = useHostDetails as jest.Mock;
const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;

const targetRecord = {
  entity: {
    id: 'host:target',
    lifecycle: { first_seen: '2024-01-10T00:00:00.000Z', last_seen: '2024-01-20T00:00:00.000Z' },
  },
  host: { name: 'target', os: { family: 'linux' }, architecture: 'x86_64' },
} as never;

const aliasRecord = {
  entity: {
    id: 'host:alias',
    lifecycle: { first_seen: '2024-01-05T00:00:00.000Z', last_seen: '2024-01-25T00:00:00.000Z' },
  },
  host: { name: 'alias', os: { family: 'windows' }, architecture: 'x86_64', ip: ['10.0.0.9'] },
} as never;

const buildStoreResult = (
  aliasRecords: EntityFromStoreResult<HostItem>['aliasRecords']
): EntityFromStoreResult<HostItem> =>
  ({
    entity: null,
    entityRecord: targetRecord,
    aliasRecords,
    firstSeen: '2024-01-10T00:00:00.000Z',
    lastSeen: '2024-01-20T00:00:00.000Z',
    isLoading: false,
    isInitialLoading: false,
    error: null,
    inspect: undefined,
    refetch: jest.fn(),
  } as unknown as EntityFromStoreResult<HostItem>);

describe('useObservedHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostDetails.mockReturnValue([
      false,
      { hostDetails: { host: { ip: ['10.0.0.1'] } }, inspect: null, refetch: jest.fn() },
    ]);
  });

  it('scopes the observed query to the target only and reads its lifecycle outside the group view', () => {
    const { result } = renderHook(() => useObservedHost('target', '', buildStoreResult([])));

    expect(mockUseHostDetails).toHaveBeenCalledWith(
      expect.objectContaining({ entityRecord: targetRecord, aliasRecords: [] })
    );
    expect(result.current.details.host?.os?.family).toBe('linux');
    expect(result.current.details.host?.ip).toEqual(['10.0.0.1']);
    expect(result.current.firstSeen.date).toBe('2024-01-10T00:00:00.000Z');
    expect(result.current.lastSeen.date).toBe('2024-01-20T00:00:00.000Z');
  });

  it('covers the aliases in the observed query and unions their attributes in the group view', () => {
    const { result } = renderHook(() =>
      useObservedHost('target', '', buildStoreResult([aliasRecord]))
    );

    expect(mockUseHostDetails).toHaveBeenCalledWith(
      expect.objectContaining({ entityRecord: targetRecord, aliasRecords: [aliasRecord] })
    );
    const { host } = result.current.details;
    expect(host?.name).toEqual(['target', 'alias']);
    expect(host?.os?.family).toEqual(['linux', 'windows']);
    expect(host?.architecture).toBe('x86_64');
    expect(host?.ip).toEqual(['10.0.0.1', '10.0.0.9']);
  });

  it('spans first/last seen across the group in the group view', () => {
    const { result } = renderHook(() =>
      useObservedHost('target', '', buildStoreResult([aliasRecord]))
    );

    expect(result.current.firstSeen.date).toBe('2024-01-05T00:00:00.000Z');
    expect(result.current.lastSeen.date).toBe('2024-01-25T00:00:00.000Z');
    expect(mockUseFirstLastSeen).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('queries over the global time range when the scope does not pin one', () => {
    renderHook(() => useObservedHost('target', '', buildStoreResult([])));

    expect(mockUseHostDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-01T00:00:00.000Z',
      })
    );
  });

  it('queries over the pinned time range when opened from the new Entity Analytics home', () => {
    renderHook(() =>
      useObservedHost('target', 'entity-analytics-new-entities-table-7d', buildStoreResult([]))
    );

    expect(mockUseHostDetails).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: 'now-7d', endDate: 'now' })
    );
  });
});
