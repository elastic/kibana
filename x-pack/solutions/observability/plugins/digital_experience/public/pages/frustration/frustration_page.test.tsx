/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { MockAppHeaderProvider } from '@kbn/app-header/mocks';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useApplicationsHref } from '../../hooks/use_applications_href';
import { useApplicationErrors } from '../errors/hooks/use_application_errors';
import { FrustrationPage } from './frustration_page';

jest.mock('../../breadcrumbs/use_route_breadcrumb');
jest.mock('../../hooks/use_application_links');
jest.mock('../../hooks/use_applications_href');
jest.mock('../errors/hooks/use_application_errors');
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

const refresh = jest.fn();

const renderPage = (source: 'otel' | 'classic') =>
  render(<FrustrationPage serviceName="my-app" source={source} />, {
    wrapper: MockAppHeaderProvider,
  });

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
    sessionsHref: () => '/sessions-href',
    sessionHref: () => '/session-href',
  });
  jest.mocked(useApplicationErrors).mockReturnValue({
    response: { serviceName: 'my-app', environments: ['production', 'staging'] },
    isLoading: false,
    error: undefined,
    refresh,
  } as unknown as ReturnType<typeof useApplicationErrors>);
});

describe('FrustrationPage', () => {
  it('titles the page and describes the signals', () => {
    renderPage('otel');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(
      'Frustration signals'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.description)).toHaveTextContent(
      'Rage, dead and error clicks reported by EDOT Browser.'
    );
  });

  it('goes back to the Overview of the application', () => {
    renderPage('otel');

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/overview-href'
    );
  });

  it('registers the breadcrumbs: the application, linked to its Overview, then Frustration', () => {
    renderPage('otel');

    expect(useRouteBreadcrumb).toHaveBeenCalledWith([
      { text: 'my-app', href: '/overview-href' },
      { text: 'Frustration' },
    ]);
  });

  it('shows the environment and time range controls with the environments of the application', () => {
    renderPage('otel');

    expect(screen.getByTestId('toolbar')).toHaveTextContent('production,staging');
  });

  it('shows the slot for the dashboard to an EDOT Browser application', () => {
    renderPage('otel');

    expect(screen.getByTestId('digitalExperienceFrustrationDashboardSlot')).toBeInTheDocument();
    expect(
      screen.queryByTestId('digitalExperienceFrustrationClassicUnavailable')
    ).not.toBeInTheDocument();
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
    expect(useApplicationErrors).not.toHaveBeenCalled();
  });
});
