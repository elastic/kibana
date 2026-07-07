/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { useObservedUserDetails } from '.';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useUiSetting } from '../../../../../common/lib/kibana';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { NOT_EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy/security_solution/users/common';

jest.mock('../../../../../common/containers/use_search_strategy', () => ({
  useSearchStrategy: jest.fn(),
}));
jest.mock('../../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../../common/lib/kibana');
  return { ...actual, useUiSetting: jest.fn(() => false) };
});
jest.mock('@kbn/entity-store/public', () => ({
  FF_ENABLE_ENTITY_STORE_V2: 'securitySolution:entityStoreEnableV2',
  useEntityStoreEuidApi: jest.fn(() => undefined),
}));

const mockUseSearchStrategy = useSearchStrategy as jest.Mock;
const mockUseUiSetting = useUiSetting as jest.Mock;
const mockUseEntityStoreEuidApi = useEntityStoreEuidApi as jest.Mock;
const mockSearch = jest.fn();

const defaultProps = {
  endDate: '2020-07-08T08:20:18.966Z',
  indexNames: ['fakebeat-*'],
  skip: false,
  startDate: '2020-07-07T08:20:18.966Z',
  userName: 'myUserName',
};

describe('useUserDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityStoreEuidApi.mockReturnValue(undefined);
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        userDetails: {},
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    renderHook(() => useObservedUserDetails(defaultProps), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
  });

  it('does not run search when skip = true', () => {
    const props = {
      ...defaultProps,
      skip: true,
    };
    renderHook(() => useObservedUserDetails(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not run search when userName is empty and entity store v2 is not enabled', () => {
    const { endDate, startDate, indexNames, skip } = defaultProps;
    renderHook(
      () =>
        useObservedUserDetails({
          endDate,
          startDate,
          indexNames,
          skip,
          userName: '',
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not run search when both entityId and userName are empty and entity store v2 is enabled', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(
      () => useObservedUserDetails({ ...defaultProps, userName: '', entityId: undefined }),
      { wrapper: TestProviders }
    );

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('runs search with user.name filter when entity store v2 is enabled and entityId is undefined but userName is provided', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useObservedUserDetails(defaultProps), { wrapper: TestProviders });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({
          bool: { must: [{ term: { 'user.name': 'myUserName' } }, NOT_EVENT_KIND_ASSET_FILTER] },
        }),
      })
    );
  });

  it('does not run search when entity store v2 is enabled and entity Id is specified but euidApi.euid is undefined', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: undefined });

    renderHook(() => useObservedUserDetails({ ...defaultProps, entityId: 'myUserName' }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('uses entity_id in filterQuery when entity store v2 is enabled', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useObservedUserDetails({ ...defaultProps, entityId: 'myUserName' }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({
          bool: { must: [{ term: { entity_id: 'myUserName' } }, NOT_EVENT_KIND_ASSET_FILTER] },
        }),
      })
    );
  });

  it('uses user.name in filterQuery when entity store v2 is disabled', () => {
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useObservedUserDetails(defaultProps), { wrapper: TestProviders });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({
          bool: { must: [{ term: { 'user.name': 'myUserName' } }, NOT_EVENT_KIND_ASSET_FILTER] },
        }),
      })
    );
  });

  it('skip = true will cancel any running request', () => {
    const props = {
      ...defaultProps,
    };
    const { rerender } = renderHook(() => useObservedUserDetails(props), {
      wrapper: TestProviders,
    });
    props.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(2);
    expect(mockUseSearchStrategy.mock.calls[1][0].abort).toEqual(true);
  });
});
