/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { installationStatuses } from '@kbn/fleet-plugin/common/constants';
import {
  INTEGRATION_BUTTON_LOADING_TEST_ID,
  SEARCH_BAR_TEST_ID,
  SearchBarSection,
} from './search_bar_section';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { INTEGRATION_BUTTON_TEST_ID } from './integrations_filter_button';
import { useKibana } from '../../../../common/lib/kibana';
import { useIntegrations } from '../../../hooks/alert_summary/use_integrations';

jest.mock('../../../../common/components/search_bar', () => ({
  // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
  SiemSearchBar: () => <div data-test-subj={'alert-summary-search-bar'} />,
}));
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../hooks/alert_summary/use_integrations');

const dataView: DataView = createStubDataView({ spec: {} });
const packages: PackageListItem[] = [
  {
    id: 'splunk',
    name: 'splunk',
    status: installationStatuses.Installed,
    title: 'Splunk',
    version: '',
  },
];
const ruleResponse = {
  rules: [],
  isLoading: false,
};

describe('<SearchBarSection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all components', () => {
    (useIntegrations as jest.Mock).mockReturnValue({
      isLoading: false,
      integrations: [],
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: jest.fn() } } },
    });

    const { getByTestId, queryByTestId } = render(
      <SearchBarSection dataView={dataView} packages={packages} ruleResponse={ruleResponse} />
    );

    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INTEGRATION_BUTTON_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(INTEGRATION_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render a loading skeleton for the integration button while fetching rules', () => {
    (useIntegrations as jest.Mock).mockReturnValue({
      isLoading: true,
      integrations: [],
    });

    const { getByTestId, queryByTestId } = render(
      <SearchBarSection dataView={dataView} packages={packages} ruleResponse={ruleResponse} />
    );

    expect(getByTestId(INTEGRATION_BUTTON_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(INTEGRATION_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
