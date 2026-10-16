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
jest.mock('../hooks/use_time_range');

const useKibanaServicesMock = jest.mocked(useKibanaServices);
const timeRange = { rangeFrom: 'now-7d', rangeTo: 'now' };
const setTimeRange = jest.fn();

beforeEach(() => {
  jest.mocked(useTimeRange).mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange });
});

describe('ApplicationPage', () => {
  it('renders the Classic RUM dashboard with the path serviceName and only the Overview tab', () => {
    const ClassicRumDashboard = jest.fn(({ serviceName }: { serviceName: string }) => (
      <div data-test-subj="classicRumDashboard">{serviceName}</div>
    ));
    useKibanaServicesMock.mockReturnValue({
      ux: { ClassicRumDashboard },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" />);

    expect(useRouteBreadcrumb).toHaveBeenCalledWith([{ title: 'my-app' }, { title: 'Overview' }]);
    expect(ClassicRumDashboard.mock.calls[0][0]).toEqual({
      serviceName: 'my-app',
      timeRange,
      onTimeRangeChange: setTimeRange,
    });
    expect(screen.getByTestId('classicRumDashboard')).toHaveTextContent('my-app');
    expect(screen.getByTestId('digitalExperienceTab-overview')).toBeInTheDocument();
    expect(screen.queryByText('Sessions')).not.toBeInTheDocument();
  });

  it('renders an empty prompt when the ux plugin is not available', () => {
    useKibanaServicesMock.mockReturnValue({} as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" />);

    expect(screen.getByTestId('digitalExperienceOverviewEmpty')).toBeInTheDocument();
  });
});
