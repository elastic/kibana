/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

vi.mock('../../../../hooks/use_kibana_ui_setting', () => {
      const mocked = {
      _esModule: true,
      useKibanaUiSetting: vi.fn(() => [
        [
          {
            from: 'now/d',
            to: 'now/d',
            display: 'Today',
          },
        ],
      ]),
    };
      return { ...mocked, default: mocked };
    });

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricsTimeControls } from './time_controls';

describe('MetricsTimeControls', () => {
  it('should set a valid from and to value for Today', async () => {
    const user = userEvent.setup();
    const currentTimeRange = {
      from: 'now-15m',
      to: 'now',
      interval: '>=1m',
    };
    const handleTimeChange = vi.fn();
    const handleRefreshChange = vi.fn();
    const handleAutoReload = vi.fn();
    const handleOnRefresh = vi.fn();

    render(
      <MetricsTimeControls
        currentTimeRange={currentTimeRange}
        onChangeTimeRange={handleTimeChange}
        setRefreshInterval={handleRefreshChange}
        setAutoReload={handleAutoReload}
        onRefresh={handleOnRefresh}
      />
    );

    const quickMenuButton = screen.getByTestId('superDatePickerToggleQuickMenuButton');
    await user.click(quickMenuButton);

    const todayButton = screen.getByTestId('superDatePickerCommonlyUsed_Today');
    await user.click(todayButton);

    expect(handleTimeChange).toHaveBeenCalledTimes(1);
    expect(handleTimeChange).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'now/d',
        to: 'now/d',
      })
    );
  });
});
