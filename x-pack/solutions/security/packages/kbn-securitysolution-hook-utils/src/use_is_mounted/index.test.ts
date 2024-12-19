/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useIsMounted } from '.';

describe('useIsMounted', () => {
  it('evaluates to true when mounted', () => {
    const { result } = renderHook(() => useIsMounted());

    expect(result.current()).toEqual(true);
  });

  it('evaluates to false when unmounted', () => {
    const { result, unmount } = renderHook(() => useIsMounted());

    unmount();
    expect(result.current()).toEqual(false);
  });
});
