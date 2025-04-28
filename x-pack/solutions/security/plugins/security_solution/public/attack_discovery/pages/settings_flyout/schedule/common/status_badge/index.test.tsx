/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { StatusBadge } from '.';
import { TestProviders } from '../../../../../../common/mock';
import { mockAttackDiscoverySchedule } from '../../../../mock/mock_attack_discovery_schedule';
import { waitForEuiToolTipVisible } from '@elastic/eui/lib/test/rtl';

const renderScheduleStatus = (
  status: 'unknown' | 'ok' | 'active' | 'error' | 'warning' = 'ok',
  message?: string
) => {
  const lastExecution = {
    date: new Date().toISOString(),
    status,
    duration: 26,
    message,
  };
  render(
    <TestProviders>
      <StatusBadge schedule={{ ...mockAttackDiscoverySchedule, lastExecution }} />
    </TestProviders>
  );
};

describe('StatusBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render schedule execution status', () => {
    renderScheduleStatus();
    expect(screen.getByTestId('scheduleExecutionStatus')).toBeInTheDocument();
  });

  it('should render correct label for `ok` status', () => {
    renderScheduleStatus('ok');
    expect(screen.getByTestId('scheduleExecutionStatus')).toHaveTextContent('Success');
  });

  it('should render correct label for `active` status', () => {
    renderScheduleStatus('active');
    expect(screen.getByTestId('scheduleExecutionStatus')).toHaveTextContent('Success');
  });

  it('should render correct label for `error` status', () => {
    renderScheduleStatus('error');
    expect(screen.getByTestId('scheduleExecutionStatus')).toHaveTextContent('Failed');
  });

  it('should render correct label for `warning` status', () => {
    renderScheduleStatus('warning');
    expect(screen.getByTestId('scheduleExecutionStatus')).toHaveTextContent('Warning');
  });

  it('should render correct label for `unknown` status', () => {
    renderScheduleStatus('unknown');
    expect(screen.getByTestId('scheduleExecutionStatus')).toHaveTextContent('Unknown');
  });

  it('should render execution status as a tooltip if execution message is not set', async () => {
    renderScheduleStatus('error');

    const status = screen.getByTestId('scheduleExecutionStatus');
    fireEvent.mouseOver(status.parentElement as Node);
    await waitForEuiToolTipVisible();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Failed');
  });

  it('should render existing execution message as a tooltip', async () => {
    renderScheduleStatus('error', 'Failed badly!');

    const status = screen.getByTestId('scheduleExecutionStatus');
    fireEvent.mouseOver(status.parentElement as Node);
    await waitForEuiToolTipVisible();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Failed badly!');
  });
});
