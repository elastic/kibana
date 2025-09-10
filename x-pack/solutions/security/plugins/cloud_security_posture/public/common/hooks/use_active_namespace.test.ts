/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react';
import { useActiveNamespace } from './use_active_namespace';

import { LOCAL_STORAGE_NAMESPACE_KEY } from '../constants';

describe('useActiveNamespace', () => {
  it('should return the active namespace from local storage for CSPM', () => {
    const { result } = renderHook(() => useActiveNamespace({ postureType: 'cspm' }));
    expect(result.current).toEqual({
      activeNamespace: 'default',
      updateActiveNamespace: expect.any(Function),
    });
  });

  it('should update the active namespace and local storage when updateActiveNamespace is called with CSPM', async () => {
    const postureType = 'cspm';
    const CSPM_NAMESPACE_LOCAL_STORAGE_KEY = `${LOCAL_STORAGE_NAMESPACE_KEY}:${postureType}`;
    const { result } = renderHook(() => useActiveNamespace({ postureType }));
    const newNamespace = 'test-namespace';

    act(() => {
      result.current.updateActiveNamespace(newNamespace);
    });

    expect(result.current.activeNamespace).toBe(newNamespace);
    expect(localStorage.getItem(CSPM_NAMESPACE_LOCAL_STORAGE_KEY)).toBe(
      JSON.stringify(newNamespace)
    );
  });

  it('should return the active namespace from local storage for KSPM', () => {
    const { result } = renderHook(() => useActiveNamespace({ postureType: 'kspm' }));
    expect(result.current).toEqual({
      activeNamespace: 'default',
      updateActiveNamespace: expect.any(Function),
    });
  });
  it('should update the active namespace and local storage when updateActiveNamespace is called with KSPM', async () => {
    const postureType = 'kspm';
    const KSPM_NAMESPACE_LOCAL_STORAGE_KEY = `${LOCAL_STORAGE_NAMESPACE_KEY}:${postureType}`;
    const { result } = renderHook(() => useActiveNamespace({ postureType }));
    const newNamespace = 'test-namespace';

    act(() => {
      result.current.updateActiveNamespace(newNamespace);
    });

    expect(result.current.activeNamespace).toBe(newNamespace);
    expect(localStorage.getItem(KSPM_NAMESPACE_LOCAL_STORAGE_KEY)).toBe(
      JSON.stringify(newNamespace)
    );
  });
});
