/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { UseTabsParams, UseTabsResult } from './use_tabs';
import { allThreeTabs, twoTabs, useTabs } from './use_tabs';

const mockStorageGet = jest.fn();
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
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

describe('useTabs', () => {
  let hookResult: RenderHookResult<UseTabsResult, UseTabsParams>;

  it('should return 3 tabs to render and the one from path as selected', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: true,
      path: { tab: 'table' },
    };

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(allThreeTabs);
    expect(hookResult.result.current.selectedTabId).toEqual('table');
  });

  it('should return 2 tabs to render and the one from path as selected', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: false,
      path: { tab: 'json' },
    };

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(twoTabs);
    expect(hookResult.result.current.selectedTabId).toEqual('json');
  });

  it('should ignore the value from path if it is not in the list of tabs to display', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: true,
      path: { tab: 'wrong' },
    };

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.selectedTabId).not.toEqual('wrong');
  });

  it('should return selected tab from local storage if it is in the list of tabs to display', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: true,
      path: undefined,
    };
    mockStorageGet.mockReturnValue('overview');

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(allThreeTabs);
    expect(hookResult.result.current.selectedTabId).toEqual('overview');
  });

  it('should ignore the local storage value  if it is not in the list of tabs to display', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: true,
      path: undefined,
    };
    mockStorageGet.mockReturnValue('wrong');

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.selectedTabId).not.toEqual('wrong');
  });

  it('should return 3 tabs to render and and the first from the list as selected tab', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: true,
      path: undefined,
    };
    mockStorageGet.mockReturnValue(undefined);

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(allThreeTabs);
    expect(hookResult.result.current.selectedTabId).toEqual('overview');
  });

  it('should return 2 tabs to render and and the first from the list as selected tab', () => {
    const initialProps: UseTabsParams = {
      flyoutIsExpandable: false,
      path: undefined,
    };
    mockStorageGet.mockReturnValue(undefined);

    hookResult = renderHook((props: UseTabsParams) => useTabs(props), { initialProps });

    expect(hookResult.result.current.tabsDisplayed).toEqual(twoTabs);
    expect(hookResult.result.current.selectedTabId).toEqual('table');
  });
});
