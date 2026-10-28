/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ApplicationPage } from './application_page';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useRouteBreadcrumb } from '../breadcrumbs/use_route_breadcrumb';
import { useTimeRange } from '../hooks/use_time_range';

jest.mock('../hooks/use_kibana_services');
jest.mock('../breadcrumbs/use_route_breadcrumb');
jest.mock('../hooks/use_time_range', () => ({
  ...jest.requireActual('../hooks/use_time_range'),
  useTimeRange: jest.fn(),
}));

const useKibanaServicesMock = jest.mocked(useKibanaServices);
const timeRange = { rangeFrom: 'now-7d', rangeTo: 'now' };
const setTimeRange = jest.fn();

beforeEach(() => {
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange,
    isTimeRangeInUrl: true,
    setTimeRange,
  });
});

describe('ApplicationPage', () => {
  it('renders the Classic RUM dashboard with the path serviceName and only the Overview tab', async () => {
    const ClassicRumDashboard = jest.fn(({ serviceName }: { serviceName: string }) => (
      <div data-test-subj="classicRumDashboard">{serviceName}</div>
    ));
    const getClassicRumDashboard = jest.fn().mockResolvedValue(ClassicRumDashboard);
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" />);

    expect(await screen.findByTestId('classicRumDashboard')).toHaveTextContent('my-app');
    expect(useRouteBreadcrumb).toHaveBeenCalledWith([{ text: 'my-app' }, { text: 'Overview' }]);
    expect(ClassicRumDashboard.mock.calls[0][0]).toEqual({
      serviceName: 'my-app',
      timeRange,
      onTimeRangeChange: setTimeRange,
    });
    expect(getClassicRumDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('digitalExperienceTab-overview')).toBeInTheDocument();
  });

  it('leaves an invalid time range out, so the dashboard uses the global timefilter', async () => {
    const ClassicRumDashboard = jest.fn((_props: { timeRange?: object }) => (
      <div data-test-subj="classicRumDashboard" />
    ));
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard: jest.fn().mockResolvedValue(ClassicRumDashboard) },
    } as unknown as ReturnType<typeof useKibanaServices>);
    jest.mocked(useTimeRange).mockReturnValue({
      timeRange: { rangeFrom: 'foo', rangeTo: 'now' },
      isTimeRangeInUrl: true,
      setTimeRange,
    });

    render(<ApplicationPage serviceName="my-app" />);

    await screen.findByTestId('classicRumDashboard');
    expect(ClassicRumDashboard.mock.calls[0][0].timeRange).toBeUndefined();
  });

  it('renders an empty prompt when the dashboard cannot be loaded', async () => {
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard: jest.fn().mockRejectedValue(new Error('chunk failed')) },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" />);

    expect(await screen.findByTestId('digitalExperienceOverviewEmpty')).toBeInTheDocument();
  });

  it('renders an empty prompt without the ux plugin, as on serverless', async () => {
    useKibanaServicesMock.mockReturnValue({} as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" />);

    expect(await screen.findByTestId('digitalExperienceOverviewEmpty')).toBeInTheDocument();
  });
});
