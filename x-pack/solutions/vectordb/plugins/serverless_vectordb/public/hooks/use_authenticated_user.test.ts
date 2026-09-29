/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { useKibana } from './use_kibana';
import { useAuthenticatedUser } from './use_authenticated_user';

vi.mock('./use_kibana', () => {
      const mocked = { useKibana: vi.fn() };
      return { ...mocked, default: mocked };
    });

const mockUseKibana = useKibana as Mock;

const createUser = (overrides: Partial<AuthenticatedUser> = {}) =>
  ({
    username: 'jdoe',
    full_name: 'Jane Doe',
    email: 'jane@elastic.co',
    roles: [],
    ...overrides,
  } as AuthenticatedUser);

describe('useAuthenticatedUser', () => {
  const getCurrentUser = vi.fn();

  const renderAuthenticatedUser = () => renderHook(() => useAuthenticatedUser()).result;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { security: { authc: { getCurrentUser } } } });
    getCurrentUser.mockResolvedValue(createUser());
  });

  it('exposes the authenticated user once it resolves', async () => {
    const user = createUser();
    getCurrentUser.mockResolvedValue(user);

    const result = renderAuthenticatedUser();

    await waitFor(() => expect(result.current.user).toBe(user));
  });

  it('leaves the user undefined until the lookup resolves', async () => {
    const result = renderAuthenticatedUser();

    expect(result.current.user).toBeUndefined();

    await waitFor(() => expect(result.current.user).toBeDefined());
  });

  it('leaves the user undefined when the lookup fails', async () => {
    getCurrentUser.mockRejectedValue(new Error('not authenticated'));

    const result = renderAuthenticatedUser();

    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(result.current.user).toBeUndefined();
  });
});
