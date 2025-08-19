/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../hooks/use_kibana_ui_setting', () => ({
  _esModule: true,
  useKibanaUiSetting: jest.fn(() => [
    [
      {
        from: 'now/d',
        to: 'now/d',
        display: 'Today',
      },
    ],
  ]),
}));

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
    const handleTimeChange = jest.fn();
    const handleRefreshChange = jest.fn();
    const handleAutoReload = jest.fn();
    const handleOnRefresh = jest.fn();

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
