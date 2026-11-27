/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsMobile, usePageSectionPaddingSize } from './use_is_mobile';

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
  });

  it.each([
    [390, true],
    [767, true],
    [768, false],
    [1440, false],
  ])('for a %ipx wide window: %s', (width, expected) => {
    window.innerWidth = width;

    expect(renderHook(() => useIsMobile()).result.current).toBe(expected);
  });

  it('shrinks the page section padding on a phone only', () => {
    window.innerWidth = 390;
    expect(renderHook(() => usePageSectionPaddingSize()).result.current).toBe('m');

    window.innerWidth = 1440;
    expect(renderHook(() => usePageSectionPaddingSize()).result.current).toBe('l');
  });
});
