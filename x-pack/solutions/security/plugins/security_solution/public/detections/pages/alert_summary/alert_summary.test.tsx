/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertSummaryPage, LOADING_INTEGRATIONS_TEST_ID } from './alert_summary';
import { useFetchIntegrations } from '../../hooks/alert_summary/use_fetch_integrations';
import { LANDING_PAGE_PROMPT_TEST_ID } from '../../components/alert_summary/landing_page/landing_page';
import { useAddIntegrationsUrl } from '../../../common/hooks/use_add_integrations_url';
import { DATA_VIEW_LOADING_PROMPT_TEST_ID } from '../../components/alert_summary/wrapper';
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useCreateDataView } from '../../../common/hooks/use_create_data_view';
import { TestProviders } from '../../../common/mock';

jest.mock('../../hooks/alert_summary/use_fetch_integrations');
jest.mock('../../../common/hooks/use_add_integrations_url');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../detection_engine/rule_management/api/hooks/use_find_rules_query');
jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/hooks/use_create_data_view');

describe('<AlertSummaryPage />', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      data: {
        rules: [
          {
            related_integrations: [{ package: 'splunk' }],
            id: 'SplunkRuleId',
          },
        ],
        total: 0,
      },
    });
  });

  it('should render loading logo', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      isLoading: true,
    });

    const { getByTestId } = render(<AlertSummaryPage />);
    expect(getByTestId(LOADING_INTEGRATIONS_TEST_ID)).toHaveTextContent('Loading integrations');
  });

  it('should render landing page if no packages are installed', () => {
    (useFetchIntegrations as jest.Mock).mockReturnValue({
      availablePackages: [{ id: 'id' }],
      installedPackages: [],
      isLoading: false,
    });
    (useAddIntegrationsUrl as jest.Mock).mockReturnValue({
      onClick: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AlertSummaryPage />
      </TestProviders>
    );
    expect(queryByTestId(LOADING_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(LANDING_PAGE_PROMPT_TEST_ID)).toBeInTheDocument();
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

    const { getByTestId, queryByTestId } = render(<AlertSummaryPage />);
    expect(queryByTestId(LOADING_INTEGRATIONS_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(LANDING_PAGE_PROMPT_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
  });
});
