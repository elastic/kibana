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
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { useIntegrationsLastActivity } from '../../hooks/alert_summary/use_integrations_last_activity';
import { ADD_INTEGRATIONS_BUTTON_TEST_ID } from './integrations/integration_section';
import { SEARCH_BAR_TEST_ID } from './search_bar/search_bar_section';
import { KPIS_SECTION } from './kpis/kpis_section';
import { GROUPED_TABLE_TEST_ID } from './table/table_section';
import { useNavigateToIntegrationsPage } from '../../hooks/alert_summary/use_navigate_to_integrations_page';

jest.mock('../../../common/components/search_bar', () => ({
  // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
  SiemSearchBar: () => <div data-test-subj={'alert-summary-search-bar'} />,
}));
jest.mock('../alerts_table/alerts_grouping', () => ({
  GroupedAlertsTable: () => <div />,
}));
jest.mock('../../../common/lib/kibana');
jest.mock('../../hooks/alert_summary/use_navigate_to_integrations_page');
jest.mock('../../hooks/alert_summary/use_integrations_last_activity');

const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    status: installationStatuses.NotInstalled,
    title: 'Splunk',
    version: '',
  },
];
const ruleResponse = {
  rules: [],
  isLoading: false,
};

describe('<Wrapper />', () => {
  it('should render a loading skeleton while creating the dataView', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest.fn(),
            clearInstanceCache: jest.fn(),
          },
        },
        http: { basePath: { prepend: jest.fn() } },
      },
    });

    render(<Wrapper packages={packages} ruleResponse={ruleResponse} />);

    await waitFor(() => {
      expect(screen.getByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId(SKELETON_TEST_ID)).toBeInTheDocument();
    });
  });

  it('should render an error if the dataView fail to be created correctly', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest.fn().mockReturnValue(undefined),
            clearInstanceCache: jest.fn(),
          },
        },
      },
    });

    jest.mock('react', () => ({
      ...jest.requireActual('react'),
      useEffect: jest.fn((f) => f()),
    }));

    render(<Wrapper packages={packages} ruleResponse={ruleResponse} />);

    expect(await screen.findByTestId(DATA_VIEW_LOADING_PROMPT_TEST_ID)).toBeInTheDocument();
    expect(await screen.findByTestId(DATA_VIEW_ERROR_TEST_ID)).toHaveTextContent(
      'Unable to create data view'
    );
  });

  it('should render the content if the dataView is created correctly', async () => {
    (useNavigateToIntegrationsPage as jest.Mock).mockReturnValue(jest.fn());
    (useIntegrationsLastActivity as jest.Mock).mockReturnValue({
      isLoading: true,
      lastActivities: {},
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: {
          dataViews: {
            create: jest
              .fn()
              .mockReturnValue({ getIndexPattern: jest.fn(), id: 'id', toSpec: jest.fn() }),
            clearInstanceCache: jest.fn(),
          },
          query: { filterManager: { getFilters: jest.fn() } },
        },
      },
    });

    jest.mock('react', () => ({
      ...jest.requireActual('react'),
      useEffect: jest.fn((f) => f()),
    }));

    render(
      <TestProviders>
        <Wrapper packages={packages} ruleResponse={ruleResponse} />
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
