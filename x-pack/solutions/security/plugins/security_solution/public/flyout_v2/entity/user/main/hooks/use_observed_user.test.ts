/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useObservedUser } from './use_observed_user';
import { useObservedUserDetails } from '../../../../../explore/users/containers/users/observed_details';
import { useFirstLastSeen } from '../../../../../common/containers/use_first_last_seen';
import type { EntityFromStoreResult } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { UserItem } from '../../../../../../common/search_strategy';

jest.mock('../../../../../explore/users/containers/users/observed_details', () => ({
  useObservedUserDetails: jest.fn(),
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

const mockUseObservedUserDetails = useObservedUserDetails as jest.Mock;
const mockUseFirstLastSeen = useFirstLastSeen as jest.Mock;

const targetRecord = {
  entity: {
    id: 'user:target',
    lifecycle: { first_seen: '2024-01-10T00:00:00.000Z', last_seen: '2024-01-20T00:00:00.000Z' },
  },
  user: { name: 'target', domain: 'corp', id: ['1'] },
} as never;

const aliasRecord = {
  entity: {
    id: 'user:alias',
    lifecycle: { first_seen: '2024-01-05T00:00:00.000Z', last_seen: '2024-01-25T00:00:00.000Z' },
  },
  user: { name: 'alias', domain: 'lab', id: ['2'] },
} as never;

const buildStoreResult = (
  aliasRecords: EntityFromStoreResult<UserItem>['aliasRecords']
): EntityFromStoreResult<UserItem> =>
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
  } as unknown as EntityFromStoreResult<UserItem>);

describe('useObservedUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseObservedUserDetails.mockReturnValue([
      false,
      { userDetails: { user: { id: ['9'] } }, inspect: null, refetch: jest.fn() },
    ]);
  });

  it('scopes the observed query to the target only and reads its lifecycle outside the group view', () => {
    const { result } = renderHook(() => useObservedUser('target', '', buildStoreResult([])));

    expect(mockUseObservedUserDetails).toHaveBeenCalledWith(
      expect.objectContaining({ entityRecord: targetRecord, aliasRecords: [] })
    );
    expect(result.current.details.user?.domain).toBe('corp');
    expect(result.current.details.user?.id).toEqual(['9', '1']);
    expect(result.current.firstSeen.date).toBe('2024-01-10T00:00:00.000Z');
    expect(result.current.lastSeen.date).toBe('2024-01-20T00:00:00.000Z');
  });

  it('covers the aliases in the observed query and unions their attributes in the group view', () => {
    const { result } = renderHook(() =>
      useObservedUser('target', '', buildStoreResult([aliasRecord]))
    );

    expect(mockUseObservedUserDetails).toHaveBeenCalledWith(
      expect.objectContaining({ entityRecord: targetRecord, aliasRecords: [aliasRecord] })
    );
    const { user } = result.current.details;
    expect(user?.name).toEqual(['target', 'alias']);
    expect(user?.domain).toEqual(['corp', 'lab']);
    expect(user?.id).toEqual(['9', '1', '2']);
  });

  it('spans first/last seen across the group in the group view', () => {
    const { result } = renderHook(() =>
      useObservedUser('target', '', buildStoreResult([aliasRecord]))
    );

    expect(result.current.firstSeen.date).toBe('2024-01-05T00:00:00.000Z');
    expect(result.current.lastSeen.date).toBe('2024-01-25T00:00:00.000Z');
    expect(mockUseFirstLastSeen).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('queries over the global time range when the scope does not pin one', () => {
    renderHook(() => useObservedUser('target', '', buildStoreResult([])));

    expect(mockUseObservedUserDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-02-01T00:00:00.000Z',
      })
    );
  });

  it('queries over the pinned time range when opened from the new Entity Analytics home', () => {
    renderHook(() =>
      useObservedUser('target', 'entity-analytics-new-entities-table-7d', buildStoreResult([]))
    );

    expect(mockUseObservedUserDetails).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: 'now-7d', endDate: 'now' })
    );
  });
});
