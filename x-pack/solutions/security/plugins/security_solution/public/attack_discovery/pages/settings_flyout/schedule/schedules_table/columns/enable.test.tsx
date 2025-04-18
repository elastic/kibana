/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import { createEnableColumn } from './enable';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';

const onSwitchChangeMock = jest.fn();

const renderEnabledSchedule = (enabled = true) => {
  const column = createEnableColumn({
    isDisabled: false,
    isLoading: false,
    onSwitchChange: onSwitchChangeMock,
  }) as EuiTableFieldDataColumnType<AttackDiscoverySchedule>;

  render(
    <TestProviders>
      {column.render?.('', { ...mockAttackDiscoverySchedule, enabled })}
    </TestProviders>
  );
};

describe('Enable Column', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render enable button', () => {
    renderEnabledSchedule();
    expect(screen.getByTestId('scheduleSwitch')).toBeInTheDocument();
  });

  it('should render enable button as checked if schedule is enabled', () => {
    renderEnabledSchedule(true);
    expect(screen.getByTestId('scheduleSwitch')).toBeChecked();
  });

  it('should render enable button as not-checked if schedule is enabled', () => {
    renderEnabledSchedule(false);
    expect(screen.getByTestId('scheduleSwitch')).not.toBeChecked();
  });

  it('should invoke `onSwitchChange` with correct parameters for the enabled schedule', async () => {
    renderEnabledSchedule(true);

    const deleteButton = screen.getByTestId('scheduleSwitch');
    fireEvent.click(deleteButton);

    expect(onSwitchChangeMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id, false);
  });

  it('should invoke `onSwitchChange` with correct parameters for the disabled schedule', async () => {
    renderEnabledSchedule(false);

    const deleteButton = screen.getByTestId('scheduleSwitch');
    fireEvent.click(deleteButton);

    expect(onSwitchChangeMock).toHaveBeenCalledWith(mockAttackDiscoverySchedule.id, true);
  });
});
