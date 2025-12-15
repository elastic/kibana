/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import type { GroupingBucket, ParsedGroupingAggregation } from '@kbn/grouping/src';

import { TestProviders } from '../../../../common/mock';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { TABLE_SECTION_TEST_ID, TableSection } from './table_section';
import { useUserData } from '../../user_info';
import { useListsConfig } from '../../../containers/detection_engine/lists/use_lists_config';
import { useGetDefaultGroupTitleRenderers } from '../../../hooks/attacks/use_get_default_group_title_renderers';
import { GroupedAlertsTable } from '../../alerts_table/alerts_grouping';
import type { AlertsGroupingAggregation } from '../../alerts_table/grouping_settings/types';
import { ALERT_ATTACK_IDS } from '../../../../../common/field_maps/field_names';

jest.mock('../../user_info');
jest.mock('../../../containers/detection_engine/lists/use_lists_config');
jest.mock('../../../hooks/attacks/use_get_default_group_title_renderers');
jest.mock('../../alerts_table/alerts_grouping', () => ({
  ...jest.requireActual('../../alerts_table/alerts_grouping'),
  GroupedAlertsTable: jest.fn(),
}));

const dataViewSpec: DataViewSpec = { title: '.alerts-security.alerts-default' };
const dataView: DataView = createStubDataView({ spec: dataViewSpec });

const mockUseGetDefaultGroupTitleRenderers = useGetDefaultGroupTitleRenderers as jest.Mock;
const mockGroupedAlertsTable = GroupedAlertsTable as unknown as jest.Mock;

describe('<TableSection />', () => {
  beforeEach(() => {
    mockUseGetDefaultGroupTitleRenderers.mockReturnValue({
      defaultGroupTitleRenderers: jest.fn(),
    });
    mockGroupedAlertsTable.mockImplementation(() => (
      <div data-test-subj="mock-grouped-alerts-table" />
    ));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: false,
    });

    const { getByTestId } = render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(getByTestId(TABLE_SECTION_TEST_ID)).toBeInTheDocument();
      expect(getByTestId('mock-grouped-alerts-table')).toBeInTheDocument();
    });
  });

  it('should call useGetDefaultGroupTitleRenderers with attackIds from onAggregationsChange when groupingLevel is 0', async () => {
    let onAggregationsChange: (
      aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>,
      groupingLevel?: number
    ) => void = () => {};
    mockGroupedAlertsTable.mockImplementation((props) => {
      onAggregationsChange = props.onAggregationsChange;
      return <div data-test-subj="mock-grouped-alerts-table" />;
    });

    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
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

    const mockAggs: ParsedGroupingAggregation<AlertsGroupingAggregation> = {
      groupByFields: {
        buckets: [
          {
            key: ['attack-id-1'],
            key_as_string: 'attack-id-1',
            doc_count: 1,
            selectedGroup: ALERT_ATTACK_IDS,
            isNullGroup: false,
          } as GroupingBucket<AlertsGroupingAggregation>,
        ],
      },
    };

    await waitFor(() => {
      onAggregationsChange(mockAggs, 0);
    });

    await waitFor(() => {
      expect(mockUseGetDefaultGroupTitleRenderers).toHaveBeenCalledWith({
        attackIds: ['attack-id-1'],
      });
    });
  });

  it('should not call useGetDefaultGroupTitleRenderers when groupingLevel is not 0', async () => {
    let onAggregationsChange: (
      aggs: ParsedGroupingAggregation<AlertsGroupingAggregation>,
      groupingLevel?: number
    ) => void = () => {};
    mockGroupedAlertsTable.mockImplementation((props) => {
      onAggregationsChange = props.onAggregationsChange;
      return <div data-test-subj="mock-grouped-alerts-table" />;
    });

    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
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

    const mockAggs: ParsedGroupingAggregation<AlertsGroupingAggregation> = {
      groupByFields: {
        buckets: [
          {
            key: ['attack-id-1'],
            key_as_string: 'attack-id-1',
            doc_count: 1,
            selectedGroup: ALERT_ATTACK_IDS,
            isNullGroup: false,
          } as GroupingBucket<AlertsGroupingAggregation>,
        ],
      },
    };

    await waitFor(() => {
      onAggregationsChange(mockAggs, 1);
    });

    await waitFor(() => {
      expect(mockUseGetDefaultGroupTitleRenderers).not.toHaveBeenCalledWith({
        attackIds: ['attack-id-1'],
      });
    });
  });

  it('should render the table while things user data is loading', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: true,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: false,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(queryByTestId('mock-grouped-alerts-table')).toBeInTheDocument();
    });
  });

  it('should render the table while things list config is loading', async () => {
    (useUserData as jest.Mock).mockReturnValue([
      {
        loading: false,
      },
    ]);
    (useListsConfig as jest.Mock).mockReturnValue({
      loading: true,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <TableSection dataView={dataView} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(queryByTestId('mock-grouped-alerts-table')).toBeInTheDocument();
    });
  });
});
