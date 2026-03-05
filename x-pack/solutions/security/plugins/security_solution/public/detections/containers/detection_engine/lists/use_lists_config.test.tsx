/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useKibana } from '../../../../common/lib/kibana';
import { useListsPrivileges } from './use_lists_privileges';
import { getUseListsPrivilegesMock } from './use_lists_privileges.mock';
import { useListsConfig } from './use_lists_config';
import { useSecuritySolutionInitialization } from '../../../../common/components/initialization';
import type { InitializationState } from '../../../../common/components/initialization';

jest.mock('../../../../common/lib/kibana');
jest.mock('./use_lists_privileges');
jest.mock('../../../../common/components/initialization');

const useSecuritySolutionInitializationMock =
  useSecuritySolutionInitialization as jest.MockedFunction<
    typeof useSecuritySolutionInitialization
  >;

const mockInitState = (overrides: Partial<InitializationState> = {}): InitializationState => ({
  'create-list-indices': {
    loading: false,
    result: { status: 'ready' },
    error: null,
  },
  ...overrides,
});

describe('useListsConfig', () => {
  let listsPrivilegesMock: ReturnType<typeof getUseListsPrivilegesMock>;

  beforeEach(() => {
    listsPrivilegesMock = getUseListsPrivilegesMock();
    (useListsPrivileges as jest.Mock).mockReturnValue(listsPrivilegesMock);
    useSecuritySolutionInitializationMock.mockReturnValue(mockInitState());
    useKibana().services.lists = {};
  });

  it("returns the user's write permissions", () => {
    listsPrivilegesMock.canWriteIndex = false;
    const { result } = renderHook(() => useListsConfig());
    expect(result.current.canWriteIndex).toBe(false);

    listsPrivilegesMock.canWriteIndex = true;
    const { result: result2 } = renderHook(() => useListsConfig());
    expect(result2.current.canWriteIndex).toBe(true);
  });

  describe('when lists are disabled', () => {
    beforeEach(() => {
      useKibana().services.lists = undefined;
    });

    it('indicates that lists are not enabled, and needs configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.enabled).toBe(false);
      expect(result.current.needsConfiguration).toBe(true);
    });
  });

  describe('when initialization is loading', () => {
    beforeEach(() => {
      useSecuritySolutionInitializationMock.mockReturnValue(
        mockInitState({
          'create-list-indices': { loading: true, result: null, error: null },
        })
      );
    });

    it('reports loading', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.loading).toBe(true);
      expect(result.current.needsIndex).toBe(true);
      expect(result.current.needsConfiguration).toBe(false);
    });
  });

  describe('when initialization succeeded', () => {
    it('does not need configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.needsConfiguration).toBe(false);
      expect(result.current.needsIndex).toBe(false);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('when initialization failed', () => {
    beforeEach(() => {
      useSecuritySolutionInitializationMock.mockReturnValue(
        mockInitState({
          'create-list-indices': {
            loading: false,
            result: null,
            error: 'Index creation failed',
          },
        })
      );
    });

    it('needs configuration', () => {
      const { result } = renderHook(() => useListsConfig());
      expect(result.current.needsConfiguration).toBe(true);
      expect(result.current.needsIndex).toBe(true);
    });
  });

  it('calls useSecuritySolutionInitialization with create-list-indices', () => {
    renderHook(() => useListsConfig());
    expect(useSecuritySolutionInitializationMock).toHaveBeenCalledWith(['create-list-indices']);
  });
});
