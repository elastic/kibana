/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { ID, useHostDetails } from '.';
import { useSearchStrategy } from '../../../../../common/containers/use_search_strategy';
import { useUiSetting } from '../../../../../common/lib/kibana';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';

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
  hostName: 'my-macbook',
  id: ID,
  indexNames: ['fakebeat-*'],
  skip: false,
  startDate: '2020-07-07T08:20:18.966Z',
};

describe('useHostDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUiSetting.mockReturnValue(false);
    mockUseEntityStoreEuidApi.mockReturnValue(undefined);
    mockUseSearchStrategy.mockReturnValue({
      loading: false,
      result: {
        hostDetails: {},
      },
      search: mockSearch,
      refetch: jest.fn(),
      inspect: {},
    });
  });

  it('runs search', () => {
    renderHook(() => useHostDetails(defaultProps), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalled();
  });

  it('does not run search when skip = true', () => {
    const props = {
      ...defaultProps,
      skip: true,
    };
    renderHook(() => useHostDetails(props), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not run search when hostName is empty and entity store v2 is not enabled', () => {
    const { endDate, startDate, indexNames, id, skip } = defaultProps;
    renderHook(
      () =>
        useHostDetails({
          endDate,
          startDate,
          indexNames,
          id,
          skip,
          hostName: '',
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('does not run search when both entityId and hostName are empty and entity store v2 is enabled', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useHostDetails({ ...defaultProps, hostName: '', entityId: undefined }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('runs search with host.name filter when entity store v2 is enabled and entityId is undefined but hostName is provided', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useHostDetails(defaultProps), { wrapper: TestProviders });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({ term: { 'host.name': 'my-macbook' } }),
      })
    );
  });

  it('does not run search when entity store v2 is enabled and entity Id is specified but euidApi.euid is undefined', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: undefined });

    renderHook(() => useHostDetails({ ...defaultProps, entityId: 'my-macbook' }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('uses entity_id in filterQuery when entity store v2 is enabled', () => {
    mockUseUiSetting.mockReturnValue(true);
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useHostDetails({ ...defaultProps, entityId: 'my-macbook' }), {
      wrapper: TestProviders,
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({ term: { entity_id: 'my-macbook' } }),
      })
    );
  });

  it('uses host.name in filterQuery when entity store v2 is disabled', () => {
    mockUseEntityStoreEuidApi.mockReturnValue({ euid: {} });

    renderHook(() => useHostDetails(defaultProps), { wrapper: TestProviders });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: JSON.stringify({ term: { 'host.name': 'my-macbook' } }),
      })
    );
  });

  it('skip = true will cancel any running request', () => {
    const props = {
      ...defaultProps,
    };
    const { rerender } = renderHook(() => useHostDetails(props), {
      wrapper: TestProviders,
    });
    props.skip = true;
    act(() => rerender());
    expect(mockUseSearchStrategy).toHaveBeenCalledTimes(2);
    expect(mockUseSearchStrategy.mock.calls[1][0].abort).toEqual(true);
  });
});
