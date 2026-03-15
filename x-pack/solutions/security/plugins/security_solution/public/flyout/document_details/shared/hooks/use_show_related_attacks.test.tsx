/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';

import type {
  UseShowRelatedAttacksParams,
  UseShowRelatedAttacksResult,
} from './use_show_related_attacks';
import { useShowRelatedAttacks } from './use_show_related_attacks';

describe('useShowRelatedAttacks', () => {
  let hookResult: RenderHookResult<UseShowRelatedAttacksResult, UseShowRelatedAttacksParams>;

  it('should return false if getFieldsData returns null', () => {
    const getFieldsData = () => null;
    hookResult = renderHook(() => useShowRelatedAttacks({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: false, attackIds: [] });
  });

  it('should return true if getFieldsData has attack ids', () => {
    const getFieldsData = () => ['attack-id-1', 'attack-id-2'];
    hookResult = renderHook(() => useShowRelatedAttacks({ getFieldsData }));

    expect(hookResult.result.current).toEqual({
      show: true,
      attackIds: ['attack-id-1', 'attack-id-2'],
    });
  });
});
