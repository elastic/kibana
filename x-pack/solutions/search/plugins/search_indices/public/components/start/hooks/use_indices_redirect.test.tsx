/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIndicesRedirect } from './use_indices_redirect';
import { useKibana } from '../../../hooks/use_kibana';
import { navigateToIndexDetails } from '../../utils';
import type { UserStartPrivilegesResponse, IndicesStatusResponse } from '../../../../common';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../../contexts/usage_tracker_context', () => ({
  useUsageTracker: jest.fn(() => ({
    click: jest.fn(),
  })),
}));

jest.mock('../../utils', () => ({
  navigateToIndexDetails: jest.fn(),
}));

describe('useIndicesRedirect', () => {
  const mockNavigateToApp = jest.fn();
  const mockIsSampleIndex = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSampleIndex.mockReset();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
        http: {},
        sampleDataIngest: {
          isSampleIndex: mockIsSampleIndex,
        },
      },
    });
  });

  it('should navigate to "discover" if user does not have manage index privileges', () => {
    const userPrivileges = {
      privileges: {
        canManageIndex: false,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(undefined, userPrivileges));

    expect(mockNavigateToApp).toHaveBeenCalledWith('discover');
  });

  it('should navigate to "elasticsearchIndexManagement" if indicesStatus has more than one index', () => {
    const indicesStatus = {
      indexNames: ['index1', 'index2'],
    } as IndicesStatusResponse;

    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(indicesStatus, userPrivileges));

    expect(mockNavigateToApp).toHaveBeenCalledWith('elasticsearchIndexManagement');
  });

  it('should not navigate if indicesStatus is undefined', () => {
    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(undefined, userPrivileges));

    expect(mockNavigateToApp).not.toHaveBeenCalled();
    expect(navigateToIndexDetails).not.toHaveBeenCalled();
  });

  it('should not navigate if indicesStatus has no indices', () => {
    const indicesStatus = {
      indexNames: [],
    } as IndicesStatusResponse;

    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(indicesStatus, userPrivileges));

    expect(mockNavigateToApp).not.toHaveBeenCalled();
    expect(navigateToIndexDetails).not.toHaveBeenCalled();
  });

  it('should not navigate if userPrivileges is undefined', () => {
    const indicesStatus = {
      indexNames: ['index1'],
    } as IndicesStatusResponse;

    renderHook(() => useIndicesRedirect(indicesStatus, undefined));

    expect(mockNavigateToApp).not.toHaveBeenCalled();
    expect(navigateToIndexDetails).not.toHaveBeenCalled();
  });

  it('should navigate to "elasticsearchIndexManagement" if lastStatus is undefined and indicesStatus has indices', () => {
    const indicesStatus = {
      indexNames: ['index1', 'index2'],
    } as IndicesStatusResponse;

    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    renderHook(() => useIndicesRedirect(indicesStatus, userPrivileges));

    expect(mockNavigateToApp).toHaveBeenCalledWith('elasticsearchIndexManagement');
  });

  it('should navigate to index details if single index is not a sample index', () => {
    const emptyIndicesStatus = {
      indexNames: [],
    } as IndicesStatusResponse;

    const indicesStatus = {
      indexNames: ['regular_index'],
    } as IndicesStatusResponse;

    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    mockIsSampleIndex.mockReturnValue(false);

    const { rerender } = renderHook((props) => useIndicesRedirect(props, userPrivileges), {
      initialProps: emptyIndicesStatus,
    });

    rerender(indicesStatus);

    expect(mockIsSampleIndex).toHaveBeenCalledWith('regular_index');
    expect(navigateToIndexDetails).toHaveBeenCalled();
  });

  it('should not navigate if single index is a sample index', () => {
    const emptyIndicesStatus = {
      indexNames: [],
    } as IndicesStatusResponse;
    const indicesStatus = {
      indexNames: ['sample_index'],
    } as IndicesStatusResponse;
    const userPrivileges = {
      privileges: {
        canManageIndex: true,
      },
    } as UserStartPrivilegesResponse;

    mockIsSampleIndex.mockReturnValue(true);

    const { rerender } = renderHook((props) => useIndicesRedirect(props, userPrivileges), {
      initialProps: emptyIndicesStatus,
    });

    rerender(indicesStatus);

    expect(mockIsSampleIndex).toHaveBeenCalledWith('sample_index');
    expect(mockNavigateToApp).not.toHaveBeenCalled();
    expect(navigateToIndexDetails).not.toHaveBeenCalled();
  });
});
