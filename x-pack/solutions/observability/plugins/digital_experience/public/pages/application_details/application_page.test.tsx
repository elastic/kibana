/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { ApplicationPage } from './application_page';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { useTimeRange } from '../../hooks/use_time_range';
import { useEnvironment } from '../../hooks/use_environment';

jest.mock('../../hooks/use_kibana_services');
jest.mock('../../hooks/use_environment');
jest.mock('../../breadcrumbs/use_route_breadcrumb');
jest.mock('../../hooks/use_applications_href', () => ({
  useApplicationsHref: () => '/app/digital_experience/?rangeFrom=now-7d&rangeTo=now',
}));
// The Overview fetches its own data; this page only has to render it for OTel applications.
jest.mock('./otel_overview/otel_overview', () => ({
  OtelOverview: ({ serviceName }: { serviceName: string }) => (
    <div data-test-subj="otelOverview">{serviceName}</div>
  ),
}));
jest.mock('../../hooks/use_time_range', () => ({
  ...jest.requireActual('../../hooks/use_time_range'),
  useTimeRange: jest.fn(),
}));

const useKibanaServicesMock = jest.mocked(useKibanaServices);
const timeRange = { rangeFrom: 'now-7d', rangeTo: 'now' };
const setTimeRange = jest.fn();

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: MockAppHeaderProvider });

beforeEach(() => {
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: undefined, setEnvironment: jest.fn() });
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

    render(<ApplicationPage serviceName="my-app" source="classic" />);

    expect(await screen.findByTestId('classicRumDashboard')).toHaveTextContent('my-app');
    expect(useRouteBreadcrumb).toHaveBeenCalledWith([{ text: 'my-app' }, { text: 'Overview' }]);
    expect(ClassicRumDashboard.mock.calls[0][0]).toEqual({
      serviceName: 'my-app',
      environment: undefined,
      timeRange,
      onTimeRangeChange: setTimeRange,
    });
    expect(getClassicRumDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('digitalExperienceTab-overview')).toBeInTheDocument();
  });

  it('renders the application name as the title, with a back link to the Applications list', () => {
    useKibanaServicesMock.mockReturnValue({} as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="otel" />);

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('my-app');
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/digital_experience/?rangeFrom=now-7d&rangeTo=now'
    );
  });

  it('opens the Classic RUM dashboard in the environment selected in the list', async () => {
    jest
      .mocked(useEnvironment)
      .mockReturnValue({ environment: 'production', setEnvironment: jest.fn() });
    const ClassicRumDashboard = jest.fn((_props: { environment?: string }) => (
      <div data-test-subj="classicRumDashboard" />
    ));
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard: jest.fn().mockResolvedValue(ClassicRumDashboard) },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="classic" />);

    await screen.findByTestId('classicRumDashboard');
    expect(ClassicRumDashboard.mock.calls[0][0]).toMatchObject({ environment: 'production' });
  });

  it('shows the loading state while the Classic RUM dashboard loads', () => {
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard: jest.fn(() => new Promise(() => {})) },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="classic" />);

    expect(screen.getByTestId('digitalExperienceOverviewLoading')).toHaveTextContent(
      'Loading the Overview'
    );
  });

  it('renders an empty prompt when the dashboard cannot be loaded', async () => {
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard: jest.fn().mockRejectedValue(new Error('chunk failed')) },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="classic" />);

    expect(await screen.findByTestId('digitalExperienceOverviewEmpty')).toBeInTheDocument();
  });

  it('renders an empty prompt without the ux plugin, as on serverless', async () => {
    useKibanaServicesMock.mockReturnValue({} as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="classic" />);

    expect(await screen.findByTestId('digitalExperienceOverviewEmpty')).toBeInTheDocument();
  });

  it('renders the OTel Overview without loading the Classic dashboard', async () => {
    const getClassicRumDashboard = jest.fn();
    useKibanaServicesMock.mockReturnValue({
      ux: { getClassicRumDashboard },
    } as unknown as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="otel" />);

    expect(await screen.findByTestId('otelOverview')).toHaveTextContent('my-app');
    expect(getClassicRumDashboard).not.toHaveBeenCalled();
    expect(screen.queryByTestId('classicRumDashboard')).not.toBeInTheDocument();
  });

  it('renders the OTel Overview without the ux plugin, as on serverless', async () => {
    useKibanaServicesMock.mockReturnValue({} as ReturnType<typeof useKibanaServices>);

    render(<ApplicationPage serviceName="my-app" source="otel" />);

    expect(await screen.findByTestId('otelOverview')).toBeInTheDocument();
    expect(screen.queryByTestId('digitalExperienceOverviewEmpty')).not.toBeInTheDocument();
  });
});
