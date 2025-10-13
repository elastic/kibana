/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import type { AlertsTableComponentProps } from './alerts_sub_grouping';
import { GroupedSubLevelComponent } from './alerts_sub_grouping';
import { useQueryAlerts } from '../../containers/detection_engine/alerts/use_query';
import { groupingSearchResponse } from './grouping_settings/mock';
import { useKibana } from '../../../common/lib/kibana';
import { createTelemetryServiceMock } from '../../../common/lib/telemetry/telemetry_service.mock';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { getMockDataViewWithMatchedIndices } from '../../../data_view_manager/mocks/mock_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TableId } from '@kbn/securitysolution-data-table';
import { defaultGroupStatsAggregations } from './grouping_settings';
import { PageScope } from '../../../data_view_manager/constants';
import {
  fetchQueryAlerts,
  fetchQueryUnifiedAlerts,
} from '../../containers/detection_engine/alerts/api';

jest.mock('../../containers/detection_engine/alerts/use_query');
jest.mock('../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../common/lib/kibana');
jest.mock('../../containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: jest.fn(),
  fetchQueryUnifiedAlerts: jest.fn(),
}));

const mockedTelemetry = createTelemetryServiceMock();
(useKibana as jest.Mock).mockReturnValue({
  services: {
    telemetry: mockedTelemetry,
    storage: {
      get: jest.fn(),
      set: jest.fn(),
    },
    uiSettings: {
      get: jest.fn(),
    },
  },
});

const mockDate = {
  from: '2020-07-07T08:20:18.966Z',
  to: '2020-07-08T08:20:18.966Z',
};

const mockUseQueryAlerts = useQueryAlerts as jest.Mock;
const mockQueryResponse = {
  loading: false,
  data: {},
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};

const dataView: DataView = getMockDataViewWithMatchedIndices(['test']);

const testProps: AlertsTableComponentProps = {
  ...mockDate,
  getGrouping: jest.fn(() => <div>{'getGrouping output'}</div>),
  groupStatsAggregations: defaultGroupStatsAggregations,
  defaultFilters: [],
  globalFilters: [],
  globalQuery: {
    query: 'query',
    language: 'language',
  },
  loading: false,
  onGroupClose: jest.fn(),
  pageIndex: 0,
  pageSize: 10,
  renderChildComponent: jest.fn(),
  runtimeMappings: {},
  selectedGroup: 'kibana.alert.rule.name',
  setPageIndex: jest.fn(),
  setPageSize: jest.fn(),
  signalIndexName: 'test-index',
  tableId: TableId.test,
};

describe('GroupedSubLevelComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDataView as jest.Mock).mockReturnValue({
      status: 'ready',
      dataView,
    });
    mockUseQueryAlerts.mockImplementation((i) => {
      if (i.skip) {
        return mockQueryResponse;
      }
      return {
        ...mockQueryResponse,
        data: groupingSearchResponse,
      };
    });
  });

  it('renders correctly and calls getGrouping', async () => {
    const { getByText } = render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(testProps.getGrouping).toHaveBeenCalled();
      expect(getByText('getGrouping output')).toBeInTheDocument();
    });
  });

  it('calls onAggregationsChange when aggregations are updated', async () => {
    const onAggregationsChange = jest.fn();
    render(
      <TestProviders>
        <GroupedSubLevelComponent
          {...testProps}
          onAggregationsChange={onAggregationsChange}
          groupingLevel={1}
        />
      </TestProviders>
    );

    await waitFor(() => {
      expect(onAggregationsChange).toHaveBeenCalledWith(expect.any(Object), 1);
    });
  });

  it('skips fetching groups when selectedGroup is "none"', async () => {
    render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} selectedGroup="none" />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockUseQueryAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: true,
        })
      );
    });
  });

  it('passes loading state to getGrouping', async () => {
    render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} loading={true} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(testProps.getGrouping).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: true,
        })
      );
    });
  });

  it('calls setPageIndex and setPageSize on pagination changes', async () => {
    render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(testProps.getGrouping).toHaveBeenCalled();
    });

    const getGroupingProps = (testProps.getGrouping as jest.Mock).mock.calls[0][0];
    getGroupingProps.onChangeGroupsPage(2);
    getGroupingProps.onChangeGroupsItemsPerPage(50);

    expect(testProps.setPageIndex).toHaveBeenCalledWith(2);
    expect(testProps.setPageSize).toHaveBeenCalledWith(50);
  });

  it('processes groupTakeActionItems correctly', async () => {
    const groupTakeActionItems = jest.fn(() => undefined);
    render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} groupTakeActionItems={groupTakeActionItems} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(testProps.getGrouping).toHaveBeenCalledWith(
        expect.objectContaining({
          takeActionItems: expect.any(Function),
        })
      );
    });

    const getGroupingProps = (testProps.getGrouping as jest.Mock).mock.calls[0][0];
    getGroupingProps.takeActionItems([], 0);

    expect(groupTakeActionItems).toHaveBeenCalled();
  });

  it('uses fetchQueryUnifiedAlerts when pageScope is "attacks"', async () => {
    render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} pageScope={PageScope.attacks} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockUseQueryAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchMethod: fetchQueryUnifiedAlerts,
        })
      );
    });
  });

  it('uses fetchQueryAlerts when pageScope is "alerts"', async () => {
    render(
      <TestProviders>
        <GroupedSubLevelComponent {...testProps} pageScope={PageScope.alerts} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockUseQueryAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchMethod: fetchQueryAlerts,
        })
      );
    });
  });
});
