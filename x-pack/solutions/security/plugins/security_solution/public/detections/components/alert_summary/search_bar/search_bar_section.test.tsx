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
  SEARCH_BAR_TEST_ID,
  SearchBarSection,
  SOURCE_BUTTON_LOADING_TEST_ID,
} from './search_bar_section';
import { useFindRulesQuery } from '../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { SOURCE_BUTTON_TEST_ID } from './sources_filter_button';
import { useKibana } from '../../../../common/lib/kibana';
import { useSources } from '../../../hooks/alert_summary/use_get_sources';

jest.mock('../../../../common/components/search_bar', () => ({
  // The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables so we can't use SEARCH_BAR_TEST_ID
  SiemSearchBar: () => <div data-test-subj={'alert-summary-search-bar'} />,
}));
jest.mock('../../../../detection_engine/rule_management/api/hooks/use_find_rules_query');
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../hooks/alert_summary/use_get_sources');

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

describe('<SearchBarSection />', () => {
  it('should render all components', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      isLoading: false,
    });
    (useSources as jest.Mock).mockReturnValue([]);
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { query: { filterManager: jest.fn() } } },
    });

    const { getByTestId, queryByTestId } = render(
      <SearchBarSection dataView={dataView} packages={packages} />
    );

    expect(getByTestId(SEARCH_BAR_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(SOURCE_BUTTON_LOADING_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId(SOURCE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render a loading skeleton for the source button while fetching rules', () => {
    (useFindRulesQuery as jest.Mock).mockReturnValue({
      isLoading: true,
    });
    (useSources as jest.Mock).mockReturnValue([]);

    const { getByTestId, queryByTestId } = render(
      <SearchBarSection dataView={dataView} packages={packages} />
    );

    expect(getByTestId(SOURCE_BUTTON_LOADING_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(SOURCE_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
