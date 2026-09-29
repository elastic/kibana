/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { RenderHookResult } from '@testing-library/react';
import { waitFor, act, cleanup, renderHook } from '@testing-library/react';
import type { QueryToggle } from '.';
import { useQueryToggle } from '.';
import type { RouteSpyState } from '../../utils/route/types';
import { SecurityPageName } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana';

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
vi.mock('../../lib/kibana');
vi.mock('../../utils/route/use_route_spy', () => {
      const mocked = {
      useRouteSpy: () => [mockRouteSpy],
    };
      return { ...mocked, default: mocked };
    });

describe('useQueryToggle', () => {
  let result: RenderHookResult<QueryToggle, unknown>['result'];

  const mockSet = vi.fn();
  beforeAll(() => {
    (useKibana as Mock).mockReturnValue({
      services: {
        storage: {
          get: () => true,
          set: mockSet,
        },
      },
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('Toggles local storage', async () => {
    ({ result } = renderHook(() => useQueryToggle('queryId')));
    await waitFor(() => expect(result.current.toggleStatus).toEqual(true));

    act(() => {
      result.current.setToggleStatus(false);
    });
    expect(result.current.toggleStatus).toEqual(false);
    expect(mockSet).toHaveBeenCalledWith('kibana.siem:queryId.query.toggle:overview', false);
    cleanup();
  });
  it('null storage key, do not set', async () => {
    ({ result } = renderHook(() => useQueryToggle()));
    await waitFor(() => expect(result.current.toggleStatus).toEqual(true));

    act(() => {
      result.current.setToggleStatus(false);
    });
    expect(mockSet).not.toHaveBeenCalled();
    cleanup();
  });
});
