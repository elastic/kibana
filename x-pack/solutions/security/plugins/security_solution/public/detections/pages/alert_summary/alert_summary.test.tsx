/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertSummaryPage, LOADING_INTEGRATIONS_TEST_ID } from './alert_summary_page';
import { useFetchIntegrations } from '../../hooks/alert_summary/use_fetch_integrations';
import { LANDING_PAGE_PROMPT } from '../../components/alert_summary/landing_page/landing_page';
import { DATA_VIEW_LOADING_PROMPT } from '../../components/alert_summary/wrapper';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';

jest.mock('../../hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../common/hooks/use_add_integrations_url');

describe('<AlertSummaryPage />', () => {
  it('should render loading logo', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      isLoading: true,
    });

    const { getByTestId } = render(<AlertSummaryPage />);
    expect(getByTestId(LOADING_INTEGRATIONS_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(LOADING_INTEGRATIONS_TEST_ID)).toHaveTextContent('Loading integrations');
  });

  it('should render landing page if no packages are installed', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      availableInstalledPackage: [],
      installedPackages: [],
      isLoading: false,
    });
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      onClick: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(<AlertSummaryPage />);
    expect(queryByTestId(LOADING_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(LANDING_PAGE_PROMPT)).toBeInTheDocument();
  });

  it.only('should render wrapper if packages are installed', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      availableInstalledPackage: [],
      installedPackages: [{}],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<AlertSummaryPage />);
    expect(getByTestId(LOADING_INTEGRATIONS_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(LANDING_PAGE_PROMPT)).toBeInTheDocument();
    expect(queryByTestId(DATA_VIEW_LOADING_PROMPT)).toBeInTheDocument();
  });
});
