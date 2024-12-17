/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
