/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useIsMountedRef } from '.';

describe('useIsMountedRef', () => {
  it('should return a ref that is true when mounted and false when unmounted', () => {
    const { result, unmount } = renderHook(() => useIsMountedRef());

    expect(result.current.isMountedRef.current).toBe(true);

    act(() => {
      unmount();
    });

    expect(result.current.isMountedRef.current).toBe(false);
  });
});
