/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useLibrariesListCollapsed } from './use_libraries_list_collapsed';

describe('useLibrariesListCollapsed', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts collapsed', () => {
    const { result } = renderHook(() => useLibrariesListCollapsed());

    expect(result.current.isCollapsed).toBe(true);
  });

  it('remembers that the user expanded it', () => {
    const first = renderHook(() => useLibrariesListCollapsed());
    act(() => first.result.current.toggleCollapsed());

    const second = renderHook(() => useLibrariesListCollapsed());

    expect(first.result.current.isCollapsed).toBe(false);
    expect(second.result.current.isCollapsed).toBe(false);
  });

  it('remembers that the user collapsed it again', () => {
    const first = renderHook(() => useLibrariesListCollapsed());
    act(() => first.result.current.toggleCollapsed());
    act(() => first.result.current.toggleCollapsed());

    expect(renderHook(() => useLibrariesListCollapsed()).result.current.isCollapsed).toBe(true);
  });
});
