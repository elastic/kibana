/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { TestProviders } from '../../../../common/mock';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { TABLE_SECTION_TEST_ID, TableSection } from './table_section';
import { useUserData } from '../../user_info';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import { groupingOptions, groupingSettings } from './grouping_configs';

jest.mock('../../user_info');
jest.mock('../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../alerts_table/alerts_grouping', () => ({
  GroupedAlertsTable: jest.fn(() => <div data-test-subj="grouped-alerts-table" />),
}));

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };
const dataView: DataView = createStubDataView({ spec: dataViewSpec });

describe('<TableSection />', () => {
  beforeEach(() => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: false,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    const { getByTestId } = render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId(TABLE_SECTION_TEST_ID)).toBeInTheDocument();
      expect(getByTestId('grouped-alerts-table')).toBeInTheDocument();
    });
  });

  it('should pass groupingOptions and groupingSettings to GroupedAlertsTable', async () => {
    render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(GroupedAlertsTable).toHaveBeenCalled();
      const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
      expect(props.defaultGroupingOptions).toEqual(groupingOptions);
      expect(props.settings).toEqual(groupingSettings);
    });
  });

  it('should not render the table while things user data is loading', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: true,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: false,
    });

    render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
      expect(props.loading).toBe(true);
    });
  });

  it('should not render the table while things list config is loading', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: true,
    });

    render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      const [props] = (GroupedAlertsTable as unknown as jest.Mock).mock.calls[0];
      expect(props.loading).toBe(true);
    });
  });
});
