/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { useSuggestUsers } from './use_suggest_users';

import * as api from './api';
import { mockUserProfiles } from './mock';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../hooks/use_app_toasts.mock';
import { TestProviders } from '../../mock';

vi.mock('./api');
vi.mock('../../hooks/use_app_toasts');

describe('useSuggestUsers hook', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;
  beforeEach(() => {
    vi.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);
  });

  it('returns an array of userProfiles', async () => {
    const spyOnUserProfiles = vi.spyOn(api, 'suggestUsers');
    const { result } = renderHook(() => useSuggestUsers({ searchTerm: '' }), {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(result.current.isLoading).toEqual(false));
    expect(spyOnUserProfiles).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockUserProfiles);
  });
});
