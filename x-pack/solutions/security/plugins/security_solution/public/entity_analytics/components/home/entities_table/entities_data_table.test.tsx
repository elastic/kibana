/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { RowControlColumn } from '@kbn/discover-utils';
import { EntitiesDataTable } from './entities_data_table';
import { DataViewContext, DEFAULT_ENTITIES_TABLE_CONFIG } from '.';
import { TestProviders } from '../../../../common/mock';
import { useFetchGridData } from './hooks/use_fetch_grid_data';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';
import type { EntityURLStateResult } from './hooks/use_entity_url_state';
import type { DataView } from '@kbn/data-views-plugin/common';
import { TEST_SUBJ_DATA_GRID, TEST_SUBJ_EMPTY_STATE } from './constants';

const mockUseFetchGridData = vi.mocked(useFetchGridData);
const mockUseInvestigateInTimeline = vi.mocked(useInvestigateInTimeline);
const mockUseUserPrivileges = vi.mocked(useUserPrivileges);
const mockUseAlertsPrivileges = vi.mocked(useAlertsPrivileges);
const mockUseGlobalTime = vi.mocked(useGlobalTime);
const mockUseKibana = vi.mocked(useKibana);

const capturedProps: {
  externalCustomRenderers?: CustomCellRenderer;
  columns?: string[];
  rowAdditionalLeadingControls?: RowControlColumn[];
  onFilter?: unknown;
} = {};

vi.mock('@kbn/unified-data-table', async () => {
  const actual = await vi.importActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: (props: {
      externalCustomRenderers?: CustomCellRenderer;
      columns?: string[];
      rowAdditionalLeadingControls?: RowControlColumn[];
      onFilter?: unknown;
    }) => {
      capturedProps.externalCustomRenderers = props.externalCustomRenderers;
      capturedProps.columns = props.columns;
      capturedProps.rowAdditionalLeadingControls = props.rowAdditionalLeadingControls;
      capturedProps.onFilter = props.onFilter;
      return <div data-test-subj="unifiedDataTable" />;
    },
  };
});

vi.mock('@kbn/expandable-flyout', () => {
  const mocked = {
    useExpandableFlyoutApi: vi.fn(() => ({
      openRightPanel: vi.fn(),
      openFlyout: vi.fn(),
      closeFlyout: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/use_is_new_flyout_enabled', () => {
  const mocked = {
    useIsNewFlyoutEnabled: () => false,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../flyout_v2/use_flyout_api', () => {
  const mocked = {
    useFlyoutApi: () => ({
      openEntityFlyout: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/hooks/timeline/use_investigate_in_timeline');
vi.mock('../../../../common/components/user_privileges');
vi.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');
vi.mock('../../../../common/containers/use_global_time');
vi.mock('./hooks/use_fetch_grid_data');
vi.mock('./hooks/use_styles', () => {
  const mocked = {
    useStyles: () => ({
      gridContainer: 'gridContainer',
      gridProgressBar: 'gridProgressBar',
      gridStyle: 'gridStyle',
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../common/lib/kibana');

vi.mock('react-use/lib/useLocalStorage', () => ({
  __esModule: true,
  default: vi.fn((key: string, initial: unknown) => {
    if (key.includes('settings')) {
      return [{ columns: {} }, vi.fn()];
    }
    if (key.includes('columns')) {
      return [['entity.name', 'entity.id', 'entity.source', 'alerts'], vi.fn()];
    }
    return [initial, vi.fn()];
  }),
}));

const mockDataView: DataView = {
  id: 'test-data-view',
  title: 'test-index',
  getIndexPattern: () => 'entities-latest-default',
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
    getRowsFromPages: vi.fn(
      (data: Array<{ page: unknown[] }> | undefined) => data?.flatMap((p) => p.page) ?? []
    ),
    onChangeItemsPerPage: vi.fn(),
    onResetFilters: vi.fn(),
    onSort: vi.fn(),
    setUrlQuery: vi.fn(),
    filters: [],
    pageIndex: 0,
    onChangePage: vi.fn(),
    ...overrides,
  } as EntityURLStateResult);

const defaultKibanaServices = {
  uiActions: { getTriggerCompatibleActions: vi.fn(() => []) },
  uiSettings: { get: vi.fn(() => false) },
  dataViews: {},
  data: {
    query: {
      filterManager: {
        addFilters: vi.fn(),
        getFilters: vi.fn(() => []),
      },
    },
  },
  application: { capabilities: {} },
  theme: {},
  fieldFormats: {},
  notifications: { toasts: { addError: vi.fn() } },
  storage: {},
};

const renderWithProviders = (
  state: EntityURLStateResult,
  dataView: DataView = mockDataView,
  dataViewIsLoading = false,
  config = DEFAULT_ENTITIES_TABLE_CONFIG
) =>
  render(
    <TestProviders>
      <DataViewContext.Provider value={{ dataView, dataViewIsLoading }}>
        <EntitiesDataTable state={state} config={config} />
      </DataViewContext.Provider>
    </TestProviders>
  );

describe('EntitiesDataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseInvestigateInTimeline.mockReturnValue({
      investigateInTimeline: vi.fn(),
    });

    mockUseUserPrivileges.mockReturnValue({
      timelinePrivileges: { crud: true, read: true },
      alertsPrivileges: { alerts: { read: true, edit: false, legacyUpdate: false } },
    } as unknown as ReturnType<typeof useUserPrivileges>);

    mockUseAlertsPrivileges.mockReturnValue({
      loading: false,
      hasIndexRead: true,
    } as unknown as ReturnType<typeof useAlertsPrivileges>);

    mockUseGlobalTime.mockReturnValue({
      setQuery: vi.fn(),
      deleteQuery: vi.fn(),
      isInitializing: false,
      from: 'now-15m',
      to: 'now',
    });

    mockUseKibana.mockReturnValue({
      services: defaultKibanaServices,
    } as unknown as ReturnType<typeof useKibana>);

    mockUseFetchGridData.mockReturnValue({
      data: {
        pages: [{ page: [], total: 1 }],
      },
      fetchNextPage: vi.fn(),
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useFetchGridData>);
  });

  it('renders the data grid wrapper', () => {
    const state = createMockState();
    (state.getRowsFromPages as Mock).mockReturnValue([]);

    renderWithProviders(state);

    expect(screen.getByTestId(TEST_SUBJ_DATA_GRID)).toBeInTheDocument();
  });

  it('shows loading progress bar when fetching', () => {
    const state = createMockState();
    (state.getRowsFromPages as Mock).mockReturnValue([{ id: '1' }]);

    mockUseFetchGridData.mockReturnValue({
      data: { pages: [{ page: [{ id: '1' }], total: 1 }] },
      fetchNextPage: vi.fn(),
      isFetching: true,
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useFetchGridData>);

    const { container } = renderWithProviders(state);

    const progressBar = container.querySelector('.gridProgressBar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ opacity: '1' });
  });

  it('renders empty state when no results', () => {
    const state = createMockState();
    (state.getRowsFromPages as Mock).mockReturnValue([]);

    mockUseFetchGridData.mockReturnValue({
      data: { pages: [{ page: [], total: 0 }] },
      fetchNextPage: vi.fn(),
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
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
      })
    );
  });

  describe('entity.source column renderer', () => {
    const renderCell = (value: unknown) => {
      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([{ flattened: { 'entity.source': value } }]);

      renderWithProviders(state);

      const renderer = capturedProps.externalCustomRenderers?.['entity.source'];
      if (!renderer) throw new Error('entity.source renderer was not registered');

      const row = { flattened: { 'entity.source': value } } as never;
      // The renderer only consumes `row`, so we can pass minimal stubs for the other props.
      return render(
        <TestProviders>
          {renderer({
            row,
            columnId: 'entity.source',
            rowIndex: 0,
            colIndex: 0,
            setCellProps: vi.fn(),
            isDetails: false,
            isExpanded: false,
            isExpandable: false,
            dataView: mockDataView,
            fieldFormats: {},
          } as never)}
        </TestProviders>
      );
    };

    it('renders the empty placeholder when entity.source is missing', () => {
      const { container } = renderCell(undefined);
      expect(container.textContent).toContain('—');
    });

    it('renders a single source formatted (capitalized) without the "+N" overflow badge', () => {
      const { getByText, queryByText, queryByTestId } = renderCell('entityanalytics_okta');
      expect(getByText('Entityanalytics Okta')).toBeInTheDocument();
      expect(queryByText('entityanalytics_okta')).not.toBeInTheDocument();
      expect(queryByTestId('entitySourceValue-more')).not.toBeInTheDocument();
    });

    it('renders the first formatted source and a "+N" overflow badge for array values', () => {
      const { getByText, queryByText, getByTestId } = renderCell(['okta', 'entityanalytics_okta']);
      expect(getByText('Okta')).toBeInTheDocument();
      expect(queryByText('okta')).not.toBeInTheDocument();
      expect(getByTestId('entitySourceValue-more')).toHaveTextContent('+1');
    });
  });

  describe('alerts column privilege', () => {
    it('includes the alerts column when the user has alerts read access', () => {
      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state);

      expect(capturedProps.columns).toContain('alerts');
    });

    it('hides the alerts column when the user has no RBAC alerts read access', () => {
      mockUseUserPrivileges.mockReturnValue({
        timelinePrivileges: { crud: true, read: true },
        alertsPrivileges: { alerts: { read: false, edit: false, legacyUpdate: false } },
      } as unknown as ReturnType<typeof useUserPrivileges>);

      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state);

      expect(capturedProps.columns).not.toContain('alerts');
    });

    it('hides the alerts column when the user has no index-level alerts read access', () => {
      mockUseAlertsPrivileges.mockReturnValue({
        loading: false,
        hasIndexRead: false,
      } as unknown as ReturnType<typeof useAlertsPrivileges>);

      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state);

      expect(capturedProps.columns).not.toContain('alerts');
    });
  });

  describe('supportsFieldFiltering', () => {
    it('passes onFilter to UnifiedDataTable when supportsFieldFiltering is not set', () => {
      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state);

      expect(capturedProps.onFilter).toBeDefined();
    });

    it('passes undefined onFilter to UnifiedDataTable when supportsFieldFiltering is false', () => {
      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state, mockDataView, false, {
        ...DEFAULT_ENTITIES_TABLE_CONFIG,
        supportsFieldFiltering: false,
      });

      expect(capturedProps.onFilter).toBeUndefined();
    });
  });

  describe('actions (leading control) column', () => {
    it('gives the timeline action an explicit width so the "Actions" header renders as text', () => {
      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state);

      const timelineControl = capturedProps.rowAdditionalLeadingControls?.find(
        (control) => control.id === 'entity-analytics-timeline-action'
      );
      expect(timelineControl).toBeDefined();
      // Wide enough that UnifiedDataTable's ActionsHeader shows the label instead of the icon.
      expect(timelineControl?.width).toBe(48);
    });

    it('omits the timeline action when the user cannot read timeline', () => {
      mockUseUserPrivileges.mockReturnValue({
        timelinePrivileges: { crud: false, read: false },
        alertsPrivileges: { alerts: { read: true, edit: false, legacyUpdate: false } },
      } as unknown as ReturnType<typeof useUserPrivileges>);

      const state = createMockState();
      (state.getRowsFromPages as Mock).mockReturnValue([]);

      renderWithProviders(state);

      expect(capturedProps.rowAdditionalLeadingControls).toEqual([]);
    });
  });
});
