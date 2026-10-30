/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsNewFlyoutEnabled } from './use_is_new_flyout_enabled';

describe('useIsNewFlyoutEnabled', () => {
  it('always returns true', () => {
    const { result } = renderHook(() => useIsNewFlyoutEnabled());

    expect(result.current).toBe(true);
  });
});
