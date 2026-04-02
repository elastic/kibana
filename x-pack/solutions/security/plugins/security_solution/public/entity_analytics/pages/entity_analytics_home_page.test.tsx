/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EntityAnalyticsHomePage } from './entity_analytics_home_page';
import { TestProviders } from '../../common/mock';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';

jest.mock('../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn(() => ({
    indicesExist: true,
    loading: false,
    sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
  })),
}));

jest.mock('../components/home/dynamic_risk_level_panel', () => ({
  DynamicRiskLevelPanel: () => (
    <div data-test-subj="dynamic-risk-level-panel">{'Dynamic Risk Level Panel'}</div>
  ),
}));

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn((flag: string) => {
    if (flag === 'newDataViewPickerEnabled') return false;
    return false;
  }),
}));

jest.mock('../../data_view_manager/hooks/use_data_view', () => ({
  useDataView: jest.fn(() => ({
    dataView: { id: 'test', matchedIndices: ['index-1'] },
    status: 'ready',
  })),
}));

jest.mock('../components/home/combined_risk_donut_chart', () => ({
  CombinedRiskDonutChart: () => (
    <div data-test-subj="combined-risk-donut-chart">{'Donut Chart'}</div>
  ),
}));

jest.mock('../components/home/anomalies_panel', () => ({
  EntityAnalyticsRecentAnomalies: () => (
    <div data-test-subj="recent-anomalies-panel">{'Recent anomalies'}</div>
  ),
}));

jest.mock('../components/home/entities_table', () => ({
  EntitiesTableSection: () => (
    <div data-test-subj="entity-analytics-home-entities-table">{'Entities Table'}</div>
  ),
  DataViewContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
  useEntityURLState: jest.fn(() => ({
    sort: [],
    filters: [],
    pageFilters: [],
    query: { bool: { filter: [], must: [], must_not: [], should: [] } },
    pageIndex: 0,
    urlQuery: { query: { language: 'kuery', query: '' }, filters: [] },
    setUrlQuery: jest.fn(),
    setTableOptions: jest.fn(),
    handleUpdateQuery: jest.fn(),
    pageSize: 25,
    setPageSize: jest.fn(),
    onChangeItemsPerPage: jest.fn(),
    onChangePage: jest.fn(),
    onSort: jest.fn(),
    onResetFilters: jest.fn(),
    columnsLocalStorageKey: 'entityAnalytics:columns',
    getRowsFromPages: jest.fn(() => []),
  })),
}));

jest.mock('../components/home/use_entity_store_data_view', () => ({
  useEntityStoreDataView: jest.fn(() => ({
    dataView: { id: 'test-entity-store', fields: [] },
    isLoading: false,
    error: undefined,
  })),
}));

// useEntityURLState is already mocked inside the entities_table mock above

jest.mock('../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(() => 'default'),
}));

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => ({
    openRightPanel: jest.fn(),
  })),
}));

const mockUseSourcererDataView = useSourcererDataView as jest.Mock;
const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.Mock;
const mockUseDataView = useDataView as jest.Mock;

describe('EntityAnalyticsHomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
    });

    mockUseIsExperimentalFeatureEnabled.mockImplementation((flag: string) => {
      if (flag === 'newDataViewPickerEnabled') return false;
      return false;
    });

    mockUseDataView.mockReturnValue({
      dataView: { id: 'test', matchedIndices: ['index-1'] },
      status: 'ready',
    });
  });

  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByText('Entity Analytics')).toBeInTheDocument();
  });

  it('renders the KQL search bar', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    // The SiemSearchBar should be rendered within FiltersGlobal
    expect(screen.getByTestId('entityAnalyticsHomePage')).toBeInTheDocument();
  });

  it('renders the dynamic risk level panel', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('dynamic-risk-level-panel')).toBeInTheDocument();
  });

  it('renders the anomalies placeholder panel', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('recent-anomalies-panel')).toBeInTheDocument();
  });

  it('renders the entities table', () => {
    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('entity-analytics-home-entities-table')).toBeInTheDocument();
  });

  it('renders loading spinner when sourcerer is loading', () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: true,
      loading: true,
      sourcererDataView: { id: 'test', matchedIndices: ['index-1'] },
    });

    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    expect(screen.getByTestId('entityAnalyticsHomePageLoader')).toBeInTheDocument();
  });

  it('renders empty prompt when indices do not exist', () => {
    mockUseSourcererDataView.mockReturnValue({
      indicesExist: false,
      loading: false,
      sourcererDataView: { id: 'test', matchedIndices: [] },
    });

    mockUseDataView.mockReturnValue({
      dataView: { id: 'test', matchedIndices: [] },
      status: 'ready',
    });

    render(
      <MemoryRouter>
        <EntityAnalyticsHomePage />
      </MemoryRouter>,
      { wrapper: TestProviders }
    );

    // EmptyPrompt should be rendered
    expect(screen.queryByTestId('entityAnalyticsHomePage')).not.toBeInTheDocument();
  });
});
