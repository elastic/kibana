/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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
vi.mock('./integrations/integration_section', async () => {
  const actual = (await vi.importActual('./integrations/integration_section'));
  return {
    ...actual,
    IntegrationSection: () => <div data-test-subj={actual.ADD_INTEGRATIONS_BUTTON_TEST_ID} />,
  };
});
vi.mock('./search_bar/search_bar_section', async () => {
  const actual = (await vi.importActual('./search_bar/search_bar_section'));
  return {
    ...actual,
    SearchBarSection: () => <div data-test-subj={actual.SEARCH_BAR_TEST_ID} />,
  };
});
vi.mock('./kpis/kpis_section', async () => {
  const actual = (await vi.importActual('./kpis/kpis_section'));
  return {
    ...actual,
    KPIsSection: () => <div data-test-subj={actual.KPIS_SECTION} />,
  };
});
vi.mock('./table/table_section', async () => {
  const actual = (await vi.importActual('./table/table_section'));
  return {
    ...actual,
    TableSection: () => <div data-test-subj={actual.GROUPED_TABLE_TEST_ID} />,
  };
});
vi.mock('../../../common/lib/kibana');
vi.mock('../../hooks/alert_summary/use_navigate_to_integrations_page');
vi.mock('../../hooks/alert_summary/use_integration_last_alert_ingested');
vi.mock('../../hooks/alert_summary/use_create_data_view');

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
    (useCreateEaseAlertsDataView as Mock).mockReturnValue({
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
    (useCreateEaseAlertsDataView as Mock).mockReturnValue({
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
    (useKibana as Mock).mockReturnValue({
      services: {
        data: { query: { filterManager: { getFilters: vi.fn().mockReturnValue([]) } } },
      },
    });
    (useNavigateToIntegrationsPage as Mock).mockReturnValue(vi.fn());
    (useIntegrationLastAlertIngested as Mock).mockReturnValue({
      isLoading: true,
      lastAlertIngested: {},
    });
    (useCreateEaseAlertsDataView as Mock).mockReturnValue({
      dataView: { getIndexPattern: vi.fn(), id: 'id', toSpec: vi.fn() },
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
