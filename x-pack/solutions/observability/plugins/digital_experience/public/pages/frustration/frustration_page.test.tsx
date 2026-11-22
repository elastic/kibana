/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import type { ApplicationUsageResponse } from '../../../common/types/usage';
import { useApplicationData } from '../../hooks/use_application_data';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useApplicationsHref } from '../../hooks/use_applications_href';
import { useEnvironment } from '../../hooks/use_environment';
import { useFrustrationDashboardAvailable } from '../../hooks/use_frustration_dashboard_available';
import { useTimeRange } from '../../hooks/use_time_range';
import { EMPTY_USAGE } from '../application_details/otel_overview/utils/usage_request';
import { FrustrationPage } from './frustration_page';
import { useFrustrationSessionSource } from './use_frustration_session_source';

jest.mock('../../breadcrumbs/use_route_breadcrumb');
jest.mock('../../hooks/use_application_links');
jest.mock('../../hooks/use_applications_href');
jest.mock('../../hooks/use_application_data');
jest.mock('../../hooks/use_environment');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_frustration_dashboard_available');
jest.mock('./use_frustration_session_source');
// Its own test covers the pickers; here the page only has to give it the environments.
jest.mock('../../components/application_tab_toolbar', () => ({
  ApplicationTabToolbar: ({
    environments,
    onRefresh,
  }: {
    environments: string[] | undefined;
    onRefresh: () => void;
  }) => (
    <button type="button" data-test-subj="toolbar" onClick={onRefresh}>
      {(environments ?? []).join(',')}
    </button>
  ),
}));

const mockDashboardApi = { runInteractiveSave: jest.fn() };
jest.mock('./components/frustration_dashboard', () => ({
  FrustrationDashboard: (props: {
    serviceName: string;
    environment: string | undefined;
    sessionSource: string;
    timeRange: { rangeFrom: string; rangeTo: string };
    refreshCount: number;
    onApiChange?: (api: unknown) => void;
  }) => (
    <div data-test-subj="dashboard">
      {`${props.serviceName}|${props.environment}|${props.sessionSource}|${props.timeRange.rangeFrom}|${props.refreshCount}`}
      <button
        type="button"
        data-test-subj="publishDashboardApi"
        onClick={() => props.onApiChange?.(mockDashboardApi)}
      />
    </div>
  ),
}));
// Its own test covers the privilege and the redirect; here the page only has to give it the API.
jest.mock('./use_save_as_dashboard_menu', () => ({
  useSaveAsDashboardMenu: (api?: { runInteractiveSave: () => void }) =>
    api
      ? {
          items: [
            {
              id: 'saveAsDashboard',
              label: 'Save as dashboard',
              testId: 'saveAsDashboard',
              run: () => api.runInteractiveSave(),
            },
          ],
        }
      : undefined,
}));
// Its own test covers the rows; here the page only has to give it the usage and the links.
jest.mock('../application_details/otel_overview/components/frustration_panel', () => ({
  FrustrationPanel: (props: {
    frustration: { total: number };
    isLoading: boolean;
    dashboardHref?: string;
    sessionsHref: (query: object) => string;
  }) => (
    <div
      data-test-subj="nativePanel"
      data-total={props.frustration.total}
      data-loading={props.isLoading}
      data-dashboard-href={props.dashboardHref}
      data-sessions-href={props.sessionsHref({ withFrustration: true })}
    />
  ),
}));

const usageRefresh = jest.fn();
const sessionsHref = jest.fn(() => '/sessions-href');

const USAGE: ApplicationUsageResponse = {
  serviceName: 'my-app',
  ...EMPTY_USAGE,
  frustration: { rageClicks: 3, deadClicks: 2, errorClicks: 1, total: 6, sessions: 4 },
  environments: ['production', 'staging'],
};

const mockUsage = (
  usage: Partial<ReturnType<typeof useApplicationData<ApplicationUsageResponse>>> = {}
) =>
  jest.mocked(useApplicationData).mockReturnValue({
    response: USAGE,
    isLoading: false,
    error: undefined,
    refresh: usageRefresh,
    ...usage,
  } as ReturnType<typeof useApplicationData>);

const renderPage = (source: 'otel' | 'classic') =>
  render(<FrustrationPage serviceName="my-app" source={source} />, {
    wrapper: MockAppHeaderProvider,
  });

// Waits for the lazily loaded dashboard, so it does not finish loading after the test.
const renderOtelPage = async () => {
  renderPage('otel');
  await screen.findByTestId('dashboard');
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useApplicationsHref).mockReturnValue('/applications-href');
  jest.mocked(useApplicationLinks).mockReturnValue({
    overviewHref: '/overview-href',
    overviewPath: '/my-app?source=otel',
    errorsHref: '/errors-href',
    networkHref: '/network-href',
    reportsHref: '/reports-href',
    frustrationHref: '/frustration-href',
    sessionsHref,
    sessionHref: () => '/session-href',
  });
  jest.mocked(useFrustrationDashboardAvailable).mockReturnValue(true);
  jest.mocked(useFrustrationSessionSource).mockReturnValue('summaries');
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: 'production', setEnvironment: jest.fn() });
  jest.mocked(useTimeRange).mockReturnValue({
    timeRange: { rangeFrom: 'now-24h', rangeTo: 'now' },
    isTimeRangeInUrl: true,
    setTimeRange: jest.fn(),
  });
  mockUsage();
});

describe('FrustrationPage', () => {
  it('offers to save the dashboard once it loads', async () => {
    await renderOtelPage();
    expect(screen.queryByTestId('saveAsDashboard')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('publishDashboardApi'));
    await openAppMenuOverflow();
    fireEvent.click(await screen.findByTestId('saveAsDashboard'));

    expect(mockDashboardApi.runInteractiveSave).toHaveBeenCalled();
  });

  it('titles the page and describes the signals', async () => {
    await renderOtelPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Frustration signals'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Rage, dead and error clicks reported by EDOT Browser.'
    );
  });

  it('goes back to the Overview of the application', async () => {
    await renderOtelPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/overview-href'
    );
  });

  it('registers the breadcrumbs: the application, linked to its Overview, then Frustration', async () => {
    await renderOtelPage();

    expect(useRouteBreadcrumb).toHaveBeenCalledWith([
      { text: 'my-app', href: '/overview-href' },
      { text: 'Frustration' },
    ]);
  });

  it('shows the environment and time range controls with the environments of the usage', async () => {
    await renderOtelPage();

    expect(screen.getByTestId('toolbar')).toHaveTextContent('production,staging');
  });

  it('keeps the dashboard slot around the body of an EDOT Browser application', async () => {
    await renderOtelPage();

    expect(screen.getByTestId('digitalExperienceFrustrationDashboardSlot')).toBeInTheDocument();
    expect(
      screen.queryByTestId('digitalExperienceFrustrationClassicUnavailable')
    ).not.toBeInTheDocument();
  });

  it('shows the native panel, then the dashboard of the application in the selected range, environment and session source', async () => {
    renderPage('otel');

    const slot = screen.getByTestId('digitalExperienceFrustrationDashboardSlot');
    const dashboard = await within(slot).findByTestId('dashboard');
    expect(dashboard).toHaveTextContent('my-app|production|summaries|now-24h|0');
    const inDocumentOrder = Array.from(
      slot.querySelectorAll('[data-test-subj="nativePanel"], [data-test-subj="dashboard"]'),
      (element) => element.getAttribute('data-test-subj')
    );
    expect(inDocumentOrder).toEqual(['nativePanel', 'dashboard']);
    expect(
      screen.queryByTestId('digitalExperienceFrustrationDashboardUnavailable')
    ).not.toBeInTheDocument();
  });

  it('waits for the session source before mounting the dashboard', () => {
    jest.mocked(useFrustrationSessionSource).mockReturnValue(undefined);

    renderPage('otel');

    expect(screen.getByLabelText('Loading the frustration dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(screen.getByTestId('nativePanel')).toBeInTheDocument();
  });

  it('asks for the Dashboard and Lens plugins, and still shows the native panel, without them', () => {
    jest.mocked(useFrustrationDashboardAvailable).mockReturnValue(false);

    renderPage('otel');

    expect(
      screen.getByTestId('digitalExperienceFrustrationDashboardUnavailable')
    ).toHaveTextContent('The dashboard needs the Dashboard and Lens plugins.');
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    expect(screen.getByTestId('nativePanel')).toBeInTheDocument();
  });

  it('gives the native panel the usage and the sessions links, without a link to the dashboard', async () => {
    renderPage('otel');

    const panel = await screen.findByTestId('nativePanel');
    expect(panel).toHaveAttribute('data-total', '6');
    expect(panel).toHaveAttribute('data-sessions-href', '/sessions-href');
    expect(panel).not.toHaveAttribute('data-dashboard-href');
    expect(useApplicationLinks).toHaveBeenCalledWith('my-app', 'otel');
  });

  it('keeps the dashboard and the native panel, with its own empty state, without signals', async () => {
    mockUsage({ response: { ...USAGE, ...EMPTY_USAGE } });

    renderPage('otel');

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nativePanel')).toHaveAttribute('data-total', '0');
  });

  it('shows the native panel as loading before the usage arrives', async () => {
    mockUsage({ response: undefined, isLoading: true });

    renderPage('otel');

    expect(await screen.findByTestId('nativePanel')).toHaveAttribute('data-loading', 'true');
    expect(screen.getByTestId('nativePanel')).toHaveAttribute('data-total', '0');
  });

  it('refreshes the usage and the dashboard together', async () => {
    renderPage('otel');
    await screen.findByTestId('dashboard');

    fireEvent.click(screen.getByTestId('toolbar'));

    expect(usageRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('dashboard')).toHaveTextContent(
      'my-app|production|summaries|now-24h|1'
    );
  });

  it('replaces the native panel with the error and a retry when the usage fails to load', async () => {
    mockUsage({ response: undefined, error: new Error('boom') });

    renderPage('otel');

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('nativePanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('digitalExperienceFrustrationUsageError')).toHaveTextContent('boom');

    fireEvent.click(screen.getByTestId('digitalExperienceFrustrationUsageRetry'));

    expect(usageRefresh).toHaveBeenCalledTimes(1);
  });

  it('asks for EDOT Browser instead of showing the dashboard for a Classic RUM application', () => {
    renderPage('classic');

    expect(screen.getByTestId('digitalExperienceFrustrationClassicUnavailable')).toHaveTextContent(
      'The frustration dashboard needs EDOT Browser'
    );
    expect(
      screen.queryByTestId('digitalExperienceFrustrationDashboardSlot')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument();
    expect(useApplicationData).not.toHaveBeenCalled();
  });
});
