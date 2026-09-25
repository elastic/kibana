/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { ScheduleUnit } from '../../../../../common/runtime_types';
import {
  isScheduleOverrun,
  MonitorScheduleOverrunCallout,
} from './monitor_schedule_overrun_callout';

jest.mock('./hooks/use_selected_monitor', () => ({
  useSelectedMonitor: jest.fn(),
}));

jest.mock('./hooks/use_monitor_latest_ping', () => ({
  useMonitorLatestPing: jest.fn(),
}));

jest.mock('../../../../hooks/use_capabilities', () => ({
  useCanEditSynthetics: jest.fn(() => true),
}));

jest.mock('../../contexts', () => ({
  useSyntheticsSettingsContext: () => ({ basePath: '' }),
}));

jest.mock('../../hooks', () => ({
  useGetUrlParams: () => ({ spaceId: undefined }),
}));

const { useSelectedMonitor } = jest.requireMock('./hooks/use_selected_monitor');
const { useMonitorLatestPing } = jest.requireMock('./hooks/use_monitor_latest_ping');

const renderCallout = () =>
  render(
    <I18nProvider>
      <MonitorScheduleOverrunCallout />
    </I18nProvider>
  );

describe('isScheduleOverrun', () => {
  const schedule5m = { number: '5', unit: ScheduleUnit.MINUTES };

  it('returns false when duration or schedule is missing', () => {
    expect(isScheduleOverrun(undefined, schedule5m)).toBe(false);
    expect(isScheduleOverrun(6 * 60 * 1_000_000, undefined)).toBe(false);
    expect(isScheduleOverrun(0, schedule5m)).toBe(false);
  });

  it('returns false when duration is under the schedule', () => {
    expect(isScheduleOverrun(4 * 60 * 1_000_000, schedule5m)).toBe(false);
  });

  it('returns true when duration equals or exceeds the schedule', () => {
    expect(isScheduleOverrun(5 * 60 * 1_000_000, schedule5m)).toBe(true);
    expect(isScheduleOverrun(7 * 60 * 1_000_000, schedule5m)).toBe(true);
  });
});

describe('MonitorScheduleOverrunCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when duration is within schedule', () => {
    useSelectedMonitor.mockReturnValue({
      monitor: {
        config_id: 'cfg-1',
        schedule: { number: '5', unit: ScheduleUnit.MINUTES },
      },
    });
    useMonitorLatestPing.mockReturnValue({
      latestPing: { monitor: { duration: { us: 2 * 60 * 1_000_000 } } },
    });

    const { container } = renderCallout();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a warning when the last run exceeded the schedule', () => {
    useSelectedMonitor.mockReturnValue({
      monitor: {
        config_id: 'cfg-1',
        schedule: { number: '5', unit: ScheduleUnit.MINUTES },
      },
    });
    useMonitorLatestPing.mockReturnValue({
      latestPing: { monitor: { duration: { us: 7 * 60 * 1_000_000 } } },
    });

    renderCallout();

    expect(screen.getByTestId('syntheticsMonitorScheduleOverrunCallout')).toBeInTheDocument();
    expect(screen.getByText(/Last run exceeded monitor schedule/i)).toBeInTheDocument();
    expect(screen.getByTestId('syntheticsMonitorScheduleOverrunEditButton')).toHaveAttribute(
      'href',
      '/app/synthetics/edit-monitor/cfg-1'
    );
  });

  it('skips external monitors', () => {
    useSelectedMonitor.mockReturnValue({
      monitor: {
        config_id: 'cfg-1',
        remote: { remoteName: 'cluster-a' },
      },
    });
    useMonitorLatestPing.mockReturnValue({
      latestPing: { monitor: { duration: { us: 10 * 60 * 1_000_000 } } },
    });

    const { container } = renderCallout();
    expect(container).toBeEmptyDOMElement();
  });
});
