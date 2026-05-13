/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

import type { UseTabsParams, UseTabsResult } from './use_tabs';
import { tabsDisplayed, useTabs } from './use_tabs';

const mockStorageGet = jest.fn();

jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: jest.fn().mockReturnValue({
      services: {
        storage: {
          get: () => mockStorageGet(),
        },
      },
    }),
  };
});

describe('useTabs (attack details panel)', () => {
  let hookResult: RenderHookResult<UseTabsResult, UseTabsParams>;

  beforeEach(() => {
    mockStorageGet.mockReset();
  });

  it('should return 3 tabs to render and the one from path as selected', () => {
    const initialProps: UseTabsParams = {
      path: { tab: 'table' },
    };
    mockStorageGet.mockReturnValue(undefined);

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(tabsDisplayed);
    expect(hookResult.result.current.selectedTabId).toEqual('table');
  });

  it('should ignore the value from path if it is not in the list of tabs to display', () => {
    const initialProps: UseTabsParams = {
      path: { tab: 'wrong' },
    };
    mockStorageGet.mockReturnValue(undefined);

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.selectedTabId).not.toEqual('wrong');
    // falls back to first tab when nothing else is valid
    expect(hookResult.result.current.selectedTabId).toEqual(tabsDisplayed[0].id);
  });

  it('should return selected tab from local storage if it is in the list of tabs to display', () => {
    const initialProps: UseTabsParams = {
      path: undefined,
    };
    mockStorageGet.mockReturnValue('overview');

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(tabsDisplayed);
    expect(hookResult.result.current.selectedTabId).toEqual('overview');
  });

  it('should ignore the local storage value if it is not in the list of tabs to display', () => {
    const initialProps: UseTabsParams = {
      path: undefined,
    };
    mockStorageGet.mockReturnValue('wrong');

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.selectedTabId).not.toEqual('wrong');
    // falls back to first tab
    expect(hookResult.result.current.selectedTabId).toEqual(tabsDisplayed[0].id);
  });

  it('should return 3 tabs to render and the first from the list as selected tab when no path and no storage', () => {
    const initialProps: UseTabsParams = {
      path: undefined,
    };
    mockStorageGet.mockReturnValue(undefined);

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(tabsDisplayed);
    expect(hookResult.result.current.selectedTabId).toEqual(tabsDisplayed[0].id);
  });
});
