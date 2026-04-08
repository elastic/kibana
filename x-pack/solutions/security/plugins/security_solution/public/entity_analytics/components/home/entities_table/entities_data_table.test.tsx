/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntitiesDataTable } from './entities_data_table';
import { DataViewContext } from '.';
import { TestProviders } from '../../../../common/mock';
import { useFetchGridData } from './hooks/use_fetch_grid_data';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useKibana } from '../../../../common/lib/kibana';
import type { EntityURLStateResult } from './hooks/use_entity_url_state';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  TEST_SUBJ_DATA_GRID,
  TEST_SUBJ_EMPTY_STATE,
  DEFAULT_VISIBLE_ROWS_PER_PAGE,
} from './constants';

const mockUseFetchGridData = jest.mocked(useFetchGridData);
const mockUseInvestigateInTimeline = jest.mocked(useInvestigateInTimeline);
const mockUseUserPrivileges = jest.mocked(useUserPrivileges);
const mockUseGlobalTime = jest.mocked(useGlobalTime);
const mockUseAgentBuilderAvailability = jest.mocked(useAgentBuilderAvailability);
const mockUseKibana = jest.mocked(useKibana);

jest.mock('@kbn/unified-data-table', () => {
  const actual = jest.requireActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: () => <div data-test-subj="unifiedDataTable" />,
  };
});

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => ({
    openRightPanel: jest.fn(),
    closeFlyout: jest.fn(),
  })),
}));

jest.mock('../../../../common/hooks/timeline/use_investigate_in_timeline');
jest.mock('../../../../common/components/user_privileges');
jest.mock('../../../../common/containers/use_global_time');
jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability');
jest.mock('./hooks/use_fetch_grid_data');
jest.mock('./hooks/use_styles', () => ({
  useStyles: () => ({
    gridContainer: 'gridContainer',
    gridProgressBar: 'gridProgressBar',
    gridStyle: 'gridStyle',
  }),
}));

jest.mock('../../../../common/lib/kibana');

jest.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn((key: string, initial: unknown) => {
    if (key.includes('settings')) {
      return [{ columns: {} }, jest.fn()];
    }
    if (key.includes('columns')) {
      return [['entity.name', 'entity.id', 'entity.source'], jest.fn()];
    }
    return [initial, jest.fn()];
  }),
}));

const mockDataView: DataView = {
  id: 'test-data-view',
  title: 'test-index',
  getIndexPattern: () => '.entities.v2.latest.security_default',
  timeFieldName: '@timestamp',
  fields: {
    getByName: () => undefined,
  },
} as unknown as DataView;

const createMockState = (overrides: Partial<EntityURLStateResult> = {}): EntityURLStateResult =>
  ({
    sort: [['@timestamp', 'desc']],
    query: { bool: { filter: [], must: [], must_not: [], should: [] } },
    queryError: undefined,
    pageSize: 25,
    getRowsFromPages: jest.fn(
      (data: Array<{ page: unknown[] }> | undefined) => data?.flatMap((p) => p.page) ?? []
    ),
    onChangeItemsPerPage: jest.fn(),
    onResetFilters: jest.fn(),
    onSort: jest.fn(),
    setUrlQuery: jest.fn(),
    filters: [],
    pageFilters: [],
    pageIndex: 0,
    urlQuery: {},
    setTableOptions: jest.fn(),
    handleUpdateQuery: jest.fn(),
    setPageSize: jest.fn(),
    onChangePage: jest.fn(),
    columnsLocalStorageKey: 'entityAnalytics:columns',
    ...overrides,
  } as EntityURLStateResult);

const defaultKibanaServices = {
  uiActions: { getTriggerCompatibleActions: jest.fn(() => []) },
  uiSettings: { get: jest.fn(() => false) },
  dataViews: {},
  data: {
    query: {
      filterManager: {
        addFilters: jest.fn(),
        getFilters: jest.fn(() => []),
      },
    },
  },
  application: { capabilities: {} },
  theme: {},
  fieldFormats: {},
  notifications: { toasts: { addError: jest.fn() } },
  storage: {},
};

const renderWithProviders = (
  state: EntityURLStateResult,
  dataView: DataView = mockDataView,
  dataViewIsLoading = false
) =>
  render(
    <TestProviders>
      <DataViewContext.Provider value={{ dataView, dataViewIsLoading }}>
        <EntitiesDataTable state={state} />
      </DataViewContext.Provider>
    </TestProviders>
  );

describe('EntitiesDataTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: jest.fn(),
    });

    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
    } as unknown as ReturnType<typeof useUserPrivileges>);

    mockUseGlobalTime.mockReturnValue({
      setQuery: jest.fn(),
      deleteQuery: jest.fn(),
      isInitializing: false,
      from: 'now-15m',
      to: 'now',
    });

    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: false,
      hasAgentBuilderPrivilege: false,
      isAgentChatExperienceEnabled: false,
      hasValidAgentBuilderLicense: false,
    });

    mockUseKibana.mockReturnValue({
      services: defaultKibanaServices,
    } as unknown as ReturnType<typeof useKibana>);

    mockUseFetchGridData.mockReturnValue({
      data: {
        pages: [{ page: [], total: 1 }],
      },
      fetchNextPage: jest.fn(),
      isFetching: false,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFetchGridData>);
  });

  it('renders the data grid wrapper', () => {
    const state = createMockState();
    (state.getRowsFromPages as jest.Mock).mockReturnValue([]);

    renderWithProviders(state);

    expect(screen.getByTestId(TEST_SUBJ_DATA_GRID)).toBeInTheDocument();
  });

  it('shows loading progress bar when fetching', () => {
    const state = createMockState();
    (state.getRowsFromPages as jest.Mock).mockReturnValue([{ id: '1' }]);

    mockUseFetchGridData.mockReturnValue({
      data: { pages: [{ page: [{ id: '1' }], total: 1 }] },
      fetchNextPage: jest.fn(),
      isFetching: true,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFetchGridData>);

    const { container } = renderWithProviders(state);

    const progressBar = container.querySelector('.gridProgressBar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ opacity: '1' });
  });

  it('renders empty state when no results', () => {
    const state = createMockState();
    (state.getRowsFromPages as jest.Mock).mockReturnValue([]);

    mockUseFetchGridData.mockReturnValue({
      data: { pages: [{ page: [], total: 0 }] },
      fetchNextPage: jest.fn(),
      isFetching: false,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFetchGridData>);

    renderWithProviders(state);

    expect(screen.getByTestId(TEST_SUBJ_EMPTY_STATE)).toBeInTheDocument();
  });

  it('passes correct parameters to useFetchGridData', () => {
    const state = createMockState({
      query: { bool: { filter: [{ term: { test: true } }], must: [], must_not: [], should: [] } },
      sort: [['entity.name', 'asc']],
    });

    renderWithProviders(state);

    expect(mockUseFetchGridData).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { bool: { filter: [{ term: { test: true } }], must: [], must_not: [], should: [] } },
        sort: [['entity.name', 'asc']],
        enabled: true,
        pageSize: DEFAULT_VISIBLE_ROWS_PER_PAGE,
      })
    );
  });
});
