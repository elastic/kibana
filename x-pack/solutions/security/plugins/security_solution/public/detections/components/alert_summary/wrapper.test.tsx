/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import {
  CONTENT_TEST_ID,
  DATA_VIEW_ERROR_TEST_ID,
  DATA_VIEW_LOADING_PROMPT_TEST_ID,
  SKELETON_TEST_ID,
  Wrapper,
} from './wrapper';
import { TestProviders } from '../../../common/mock';
import { useIntegrationLastAlertIngested } from '../../hooks/alert_summary/use_integration_last_alert_ingested';
import { ADD_INTEGRATIONS_BUTTON_TEST_ID } from './integrations/integration_section';
import { SEARCH_BAR_TEST_ID } from './search_bar/search_bar_section';
import { KPIS_SECTION } from './kpis/kpis_section';
import { GROUPED_TABLE_TEST_ID } from './table/table_section';
import { useNavigateToIntegrationsPage } from '../../hooks/alert_summary/use_navigate_to_integrations_page';
import { useKibana } from '../../../common/lib/kibana';
import { useCreateEaseAlertsDataView } from '../../hooks/alert_summary/use_create_data_view';

// The child sections render heavy chart/table trees whose async data hooks never settle within
// the per-test timeout, so we stub them and exercise only the Wrapper's loading/error/content branching.
jest.mock('./integrations/integration_section', () => {
  const actual = jest.requireActual('./integrations/integration_section');
  return {
    ...actual,
    IntegrationSection: () => <div data-test-subj={actual.ADD_INTEGRATIONS_BUTTON_TEST_ID} />,
  };
});
jest.mock('./search_bar/search_bar_section', () => {
  const actual = jest.requireActual('./search_bar/search_bar_section');
  return {
    ...actual,
    SearchBarSection: () => <div data-test-subj={actual.SEARCH_BAR_TEST_ID} />,
  };
});
jest.mock('./kpis/kpis_section', () => {
  const actual = jest.requireActual('./kpis/kpis_section');
  return {
    ...actual,
    KPIsSection: () => <div data-test-subj={actual.KPIS_SECTION} />,
  };
});
jest.mock('./table/table_section', () => {
  const actual = jest.requireActual('./table/table_section');
  return {
    ...actual,
    TableSection: () => <div data-test-subj={actual.GROUPED_TABLE_TEST_ID} />,
  };
});
jest.mock('../../../common/lib/kibana');
jest.mock('../../hooks/alert_summary/use_navigate_to_integrations_page');
jest.mock('../../hooks/alert_summary/use_integration_last_alert_ingested');
jest.mock('../../hooks/alert_summary/use_create_data_view');

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '',
  },
];

describe('<Wrapper />', () => {
  it('should render a loading skeleton while creating the dataView', async () => {
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: true,
    });

    render(<Wrapper packages={packages} />);

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render an error if the dataView fail to be created correctly', async () => {
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: undefined,
      loading: false,
    });

    render(<Wrapper packages={packages} />);

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
      'Unable to create data view'
    );
  });

  it('should render the content if the dataView is created correctly', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: { query: { filterManager: { getFilters: jest.fn().mockReturnValue([]) } } },
      },
    });
    (useNavigateToIntegrationsPage as jest.Mock).mockReturnValue(jest.fn());
    (useIntegrationLastAlertIngested as jest.Mock).mockReturnValue({
      isLoading: true,
      lastAlertIngested: {},
    });
    (useCreateEaseAlertsDataView as jest.Mock).mockReturnValue({
      dataView: { getIndexPattern: jest.fn(), id: 'id', toSpec: jest.fn() },
      loading: false,
    });

    render(
      <TestProviders>
        <Wrapper packages={packages} />
      </TestProviders>
    );

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(CONTENT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(ADD_INTEGRATIONS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(KPIS_SECTION)).toBeInTheDocument();
    expect(await screen.findByTestId(GROUPED_TABLE_TEST_ID)).toBeInTheDocument();
  });
});
