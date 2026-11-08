/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { HookWrapper } from '../utils/testing/hook_helpers';
import { useMonitorEnableHandler } from './use_monitor_enable_handler';

describe('useMonitorEnableHandler', () => {
  const labels = {
    failureLabel: 'failure',
    enabledSuccessLabel: 'enabled',
    disabledSuccessLabel: 'disabled',
  };

  it('resets local enabled override when switching monitor configId', () => {
    const { result, rerender } = renderHook(
      ({ configId }) =>
        useMonitorEnableHandler({
          configId,
          isEnabled: true,
          labels,
        }),
      {
        initialProps: { configId: 'monitor-a' },
        wrapper: ({ children }) => <HookWrapper>{children}</HookWrapper>,
      }
    );

    act(() => {
      result.current.updateMonitorEnabledState(false);
    });

    expect(result.current.isEnabled).toBe(false);

    rerender({ configId: 'monitor-b' });

    expect(result.current.isEnabled).toBeNull();
  });
});
