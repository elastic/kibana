/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useFlyoutApi } from './use_flyout_api';
import { useAttackFlyoutApi } from './attack/use_attack_flyout_api';
import { createAttackFlyoutApiMock } from './attack/use_attack_flyout_api.mock';

jest.mock('./attack/use_attack_flyout_api');

describe('useFlyoutApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the attack flyout methods from the composed per-type hook', () => {
    const attackApi = createAttackFlyoutApiMock();
    jest.mocked(useAttackFlyoutApi).mockReturnValue(attackApi);

    const { result } = renderHook(() => useFlyoutApi());

    const params = { attackId: 'attack-1', indexName: '.alerts-security' };

    // The facade surfaces the composed methods, and calling one delegates to the per-type hook.
    result.current.openAttackFlyout(params);
    result.current.openAttackFlyoutAsChild(params);

    expect(attackApi.openAttackFlyout).toHaveBeenCalledWith(params);
    expect(attackApi.openAttackFlyoutAsChild).toHaveBeenCalledWith(params);
  });
});
