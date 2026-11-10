/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { openAppMenuOverflow } from '@kbn/app-header/test_helpers';
import { AlertSummaryPage, LOADING_INTEGRATIONS_TEST_ID } from './alert_summary';
import { useFetchIntegrations } from '../../hooks/alert_summary/use_fetch_integrations';
import { LANDING_PAGE_PROMPT_TEST_ID } from '../../components/alert_summary/landing_page/landing_page';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';
import { DATA_VIEW_LOADING_PROMPT_TEST_ID } from '../../components/alert_summary/wrapper';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useCreateDataView } from '../../../common/hooks/use_create_data_view';
import { TestProviders } from '../../../common/mock';
import { ALERT_SUMMARY } from '../../../app/translations';

jest.mock('../../hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../common/hooks/use_add_integrations_url');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/hooks/use_create_data_view');

const renderPage = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <AlertSummaryPage />
      </MemoryRouter>
    </TestProviders>
  );

describe('<AlertSummaryPage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      href: '/app/integrations',
      onClick: jest.fn(),
    });
  });

  it('should render loading logo', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      isLoading: true,
    });

    renderPage();
    expect(screen.getByTestId(LOADING_INTEGRATIONS_TEST_ID)).toHaveTextContent(
      'Loading integrations'
    );
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(ALERT_SUMMARY);
  });

  it('should render landing page if no packages are installed', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      availablePackages: [{ id: 'id' }],
      installedPackages: [],
      isLoading: false,
    });

    renderPage();
    expect(screen.queryByTestId(LOADING_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId(LANDING_PAGE_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(ALERT_SUMMARY);
  });

  it('should render wrapper if packages are installed', async () => {
    (useCreateDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: false,
    });
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      availablePackages: [],
      installedPackages: [{ id: 'id' }],
      isLoading: false,
    });

    renderPage();
    expect(screen.queryByTestId(LOADING_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
    expect(screen.queryByTestId(LANDING_PAGE_PROMPT_TEST_ID)).not.toBeInTheDocument();
    expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent(ALERT_SUMMARY);
  });

  it('should render the doc link and no back button in the app header', async () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      isLoading: true,
    });

    renderPage();
    expect(screen.queryByTestId(APP_HEADER_TEST_SUBJECTS.back)).not.toBeInTheDocument();

    await openAppMenuOverflow();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.menuDocumentation)).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/solutions/security/ai/ease/ease-alerts'
    );
  });
});
