/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAiValueRoleCheck } from './use_ai_value_role_check';
import { useCurrentUser, type AuthenticatedElasticUser } from '../../common/lib/kibana';

// Mock the useCurrentUser hook
jest.mock('../../common/lib/kibana', () => ({
  useCurrentUser: jest.fn(),
}));

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;

// Helper function to create mock user objects
const createMockUser = (
  overrides: Partial<AuthenticatedElasticUser> = {}
): AuthenticatedElasticUser => ({
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  roles: [],
  enabled: true,
  authenticationRealm: { name: 'native', type: 'native' },
  lookupRealm: { name: 'native', type: 'native' },
  authenticationProvider: 'basic',
  ...overrides,
});

describe('useAiValueRoleCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns loading state when currentUser is null', () => {
    mockUseCurrentUser.mockReturnValue(null);

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: false,
      isLoading: true,
    });
  });

  it('returns loading state when currentUser is undefined', () => {
    mockUseCurrentUser.mockReturnValue(undefined as unknown as AuthenticatedElasticUser | null);

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: false,
      isLoading: true,
    });
  });

  it('returns hasRequiredRole true when user has admin role', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: ['admin'],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: true,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole true when user has soc_manager role', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: ['soc_manager'],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: true,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole true when user has _search_ai_lake_soc_manager role', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: ['_search_ai_lake_soc_manager'],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: true,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole true when user has multiple allowed roles', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: ['admin', 'soc_manager', 'other_role'],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: true,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole false when user has no allowed roles', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: ['viewer', 'editor'],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: false,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole false when user has empty roles array', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: [],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: false,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole false when user has undefined roles', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: undefined as unknown as string[],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: false,
      isLoading: false,
    });
  });

  it('returns hasRequiredRole false when user has null roles', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: null as unknown as string[],
      })
    );

    const { result } = renderHook(() => useAiValueRoleCheck());

    expect(result.current).toEqual({
      hasRequiredRole: false,
      isLoading: false,
    });
  });

  it('memoizes the result based on currentUser dependency', () => {
    const user1 = createMockUser({ username: 'user1', roles: ['admin'] });
    const user2 = createMockUser({ username: 'user2', roles: ['viewer'] });

    mockUseCurrentUser.mockReturnValue(user1);
    const { result, rerender } = renderHook(() => useAiValueRoleCheck());

    expect(result.current.hasRequiredRole).toBe(true);

    // Change user
    mockUseCurrentUser.mockReturnValue(user2);
    rerender();

    expect(result.current.hasRequiredRole).toBe(false);
  });

  it('calls useCurrentUser hook', () => {
    mockUseCurrentUser.mockReturnValue(
      createMockUser({
        roles: ['admin'],
      })
    );

    renderHook(() => useAiValueRoleCheck());

    expect(mockUseCurrentUser).toHaveBeenCalledTimes(1);
  });
});
