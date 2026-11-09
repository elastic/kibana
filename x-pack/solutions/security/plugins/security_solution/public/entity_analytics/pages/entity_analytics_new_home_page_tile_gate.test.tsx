/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { EntityAnalyticsNewHomePage } from './entity_analytics_new_home_page';
import * as tileHooks from '../components/home/needs_attention_tiles/hooks';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { useAnomalyPrivileges } from '../api/hooks/use_anomaly_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { EntitiesGrid } from '../components/home/entities_grid/components/entities_grid';
import { EMPTY_ENTITY_FILTERS } from '../components/home/entities_grid/common';
import { SignalCards } from '../components/home/needs_attention_tiles/signal_cards';
import { useSearchBarExpression } from '../components/home/entities_grid/hooks/use_search_bar_expression';
import type { SignalCardData } from '../components/home/needs_attention_tiles/data';

jest.mock('../components/home/needs_attention_tiles/hooks', () => ({
  useAlertBasedTiles: jest.fn(),
  useAlertBasedTilesDelta: jest.fn(),
  useAlertBasedTilesSeries: jest.fn(),
  useEntitiesWithAnomaliesCount: jest.fn(),
  useEntitiesWithAnomaliesDelta: jest.fn(),
  useEntitiesWithAnomaliesSeries: jest.fn(),
  useNewEntityCount: jest.fn(),
  useNewEntityDelta: jest.fn(),
  useNewEntitySeries: jest.fn(),
  useNewlyHighCriticalCount: jest.fn(),
  useNewlyHighCriticalDelta: jest.fn(),
  useRiskMoversCount: jest.fn(),
  useRiskMoversDelta: jest.fn(),
  useRiskTilesSeries: jest.fn(),
  useSearchedTileEntityIds: jest.fn(),
  useTilesLoadTelemetry: jest.fn(),
  useTilesErrorNotice: jest.fn(),
  useTilesTimeoutNotice: jest.fn(),
}));
jest.mock('../components/entity_store/hooks/use_entity_store', () => ({
  useEntityStoreStatus: jest.fn(),
}));
jest.mock('../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../common/hooks/use_global_filter_query', () => ({
  useGlobalFilterQuery: () => ({ filterQuery: undefined }),
}));
jest.mock('../components/home/use_entity_store_data_view', () => ({
  useEntityStoreDataView: () => ({
    dataView: { fields: { getAll: () => [] } },
    isLoading: false,
    error: undefined,
  }),
}));
jest.mock('../api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: () => ({ data: [], error: undefined }),
}));
jest.mock('../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
const mockAddWarning = jest.fn();
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addWarning: mockAddWarning }),
}));
let mockRowsMode: 'resolved' | 'individual' = 'individual';
let mockUrlStateOverrides: Record<string, unknown> = {};
jest.mock('../components/home/entities_grid/hooks/use_entity_analytics_url_state', () => ({
  useEntityAnalyticsUrlState: () => ({
    timeRange: '7d',
    setTimeRange: jest.fn(),
    entityFilters: jest.requireActual('../components/home/entities_grid/common')
      .EMPTY_ENTITY_FILTERS,
    setEntityFilters: jest.fn(),
    groupsSelected: ['none'],
    setGroupsSelected: jest.fn(),
    rowsMode: mockRowsMode,
    setRowsMode: jest.fn(),
    sortField: 'entity.risk.calculated_score_norm',
    sortDirection: 'desc',
    setSort: jest.fn(),
    activeTile: null,
    setActiveTile: jest.fn(),
    expandedIds: [],
    toggleExpandedId: jest.fn(),
    ...mockUrlStateOverrides,
  }),
}));
jest.mock('../components/home/entities_grid/hooks/use_search_bar_expression', () => ({
  useSearchBarExpression: jest.fn(() => ({
    isSearchOverridesPending: false,
    applicableFilters: [],
    ignoredFields: [],
  })),
}));
jest.mock('../components/home/entities_grid/components/entities_grid', () => ({
  EntitiesGrid: jest.fn(() => null),
}));
jest.mock('../components/home/entities_grid/components/entities_groups', () => ({
  EntitiesGroups: () => null,
}));
jest.mock('../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn(), openGraphFlyout: jest.fn() }),
}));
jest.mock('../../common/hooks/timeline/use_investigate_in_timeline', () => ({
  useInvestigateInTimeline: () => ({ investigateInTimeline: jest.fn() }),
}));
jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: () => undefined,
}));
jest.mock('../components/home/entity_search_bar', () => ({ EntitySearchBar: () => null }));
jest.mock('../components/home/entity_filters_bar', () => ({ EntityFiltersBar: () => null }));
jest.mock('../components/home/needs_attention_tiles/signal_cards', () => ({
  SignalCards: jest.fn(() => null),
}));
jest.mock('../components/home/entities_table', () => ({
  DataViewContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  useEntityURLState: () => ({ onChangePage: jest.fn(), query: undefined }),
  DEFAULT_ENTITIES_TABLE_CONFIG: {},
  DEFAULT_ENTITIES_TABLE_SORT: {},
  EntitiesTableSection: () => null,
}));
jest.mock('./entity_analytics_home_header', () => ({ EntityAnalyticsHomeHeader: () => null }));
const mockBriefButton = jest.fn();
jest.mock('../components/home/ai_brief/generate_ai_brief_button', () => ({
  GenerateAiBriefButton: (props: unknown) => {
    mockBriefButton(props);
    return null;
  },
}));
jest.mock('./entity_store_disabled_empty_prompt', () => ({
  EntityStoreDisabledEmptyPrompt: () => null,
}));
jest.mock('../../common/components/data_view_error', () => ({
  DataViewErrorComponent: () => null,
}));
jest.mock('../../common/components/page_wrapper', () => ({
  SecuritySolutionPageWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../hooks/use_missing_risk_engine_privileges', () => ({
  useMissingRiskEnginePrivileges: jest.fn(),
}));
jest.mock('../components/entity_store/hooks/use_entity_engine_privileges', () => ({
  useEntityEnginePrivileges: jest.fn(),
}));
jest.mock('../api/hooks/use_anomaly_privileges', () => ({
  useAnomalyPrivileges: jest.fn(),
}));
jest.mock('../../detections/containers/detection_engine/alerts/use_alerts_privileges', () => ({
  useAlertsPrivileges: jest.fn(),
}));

const hooks = tileHooks as unknown as Record<string, jest.Mock>;

const mockPrivileges = ({
  isLoading = false,
  isError = false,
  hasReadPermissions = true,
  alerts = true,
  alertsFeature = alerts,
  risk = true,
  anomalies = true,
}: {
  isLoading?: boolean;
  isError?: boolean;
  hasReadPermissions?: boolean;
  /** Read on the alerts index. */
  alerts?: boolean;
  /** The Security > Alerts Kibana feature privilege; follows `alerts` unless set. */
  alertsFeature?: boolean;
  risk?: boolean;
  anomalies?: boolean;
} = {}) => {
  (useMissingRiskEnginePrivileges as jest.Mock).mockReturnValue(
    risk
      ? { isLoading: false, hasAllRequiredPrivileges: true }
      : {
          isLoading: false,
          hasAllRequiredPrivileges: false,
          missingPrivileges: { indexPrivileges: [], clusterPrivileges: { enable: [], run: [] } },
        }
  );
  (useAnomalyPrivileges as jest.Mock).mockReturnValue({
    isLoading: false,
    isError: false,
    data: {
      has_read_permissions: anomalies,
      privileges: { elasticsearch: { index: {} }, kibana: {} },
    },
  });
  (useAlertsPrivileges as jest.Mock).mockReturnValue({
    hasIndexRead: alerts,
    // Like the real hook, the feature privilege and index read are both required.
    hasAlertsRead: alertsFeature && alerts,
    loading: false,
  });
  (useEntityEnginePrivileges as jest.Mock).mockReturnValue({
    isLoading,
    isError,
    data: isError
      ? undefined
      : {
          has_read_permissions: hasReadPermissions,
          privileges: { elasticsearch: { index: {} }, kibana: [] },
        },
  });
};

const getCard = (id: SignalCardData['id']): SignalCardData | undefined => {
  const { calls } = (SignalCards as jest.Mock).mock;
  return calls[calls.length - 1][0].cards.find((card: SignalCardData) => card.id === id);
};

const getBriefCard = (id: SignalCardData['id']): SignalCardData | undefined => {
  const { calls } = mockBriefButton.mock;
  return calls[calls.length - 1][0].cards.find((card: SignalCardData) => card.id === id);
};

const COUNT_HOOKS = {
  alerts: 'useAlertBasedTiles',
  anomalies: 'useEntitiesWithAnomaliesCount',
  newEntity: 'useNewEntityCount',
  riskMovers: 'useRiskMoversCount',
  newlyHighCritical: 'useNewlyHighCriticalCount',
} as const;
type Tile = keyof typeof COUNT_HOOKS;
const TILES = Object.keys(COUNT_HOOKS) as Tile[];

const DELTA_HOOKS: Record<Tile, string> = {
  alerts: 'useAlertBasedTilesDelta',
  anomalies: 'useEntitiesWithAnomaliesDelta',
  newEntity: 'useNewEntityDelta',
  riskMovers: 'useRiskMoversDelta',
  newlyHighCritical: 'useNewlyHighCriticalDelta',
};

const SERIES_HOOKS: Record<Tile, string> = {
  alerts: 'useAlertBasedTilesSeries',
  anomalies: 'useEntitiesWithAnomaliesSeries',
  newEntity: 'useNewEntitySeries',
  // The two risk tiles share one series hook.
  riskMovers: 'useRiskTilesSeries',
  newlyHighCritical: 'useRiskTilesSeries',
};

interface TileState {
  isCountPending: boolean;
  isDeltaLoading: boolean;
  reachesBack: boolean | undefined;
}
const settledTile: TileState = { isCountPending: false, isDeltaLoading: false, reachesBack: true };

/** Mocks every hook of the page from one state per tile; the alert tiles share one hook. */
const mockTiles = (
  state: Partial<Record<Tile, Partial<TileState>>> = {},
  { anomaliesMissingJobs = false }: { anomaliesMissingJobs?: boolean } = {}
) => {
  const of = (tile: Tile): TileState => ({ ...settledTile, ...state[tile] });

  hooks.useAlertBasedTiles.mockReturnValue({
    severeAlertsCount: 5,
    severeAlertsEntityIds: [],
    watchlistedCount: 2,
    watchlistedEntityIds: [],
    hasCount: true,
    isLoading: false,
    isCountPending: of('alerts').isCountPending,
  });
  const count = (tile: Tile) => ({
    count: 3,
    entityIds: [],
    hasCount: true,
    isLoading: false,
    isMissingIndex: false,
    isCountPending: of(tile).isCountPending,
  });
  hooks.useEntitiesWithAnomaliesCount.mockReturnValue({
    ...count('anomalies'),
    isMissingJobs: anomaliesMissingJobs,
  });
  hooks.useNewEntityCount.mockReturnValue(count('newEntity'));
  hooks.useRiskMoversCount.mockReturnValue(count('riskMovers'));
  hooks.useNewlyHighCriticalCount.mockReturnValue(count('newlyHighCritical'));

  hooks.useAlertBasedTilesDelta.mockReturnValue({
    severeAlertsDelta: 1,
    watchlistedDelta: 1,
    isDeltaLoading: of('alerts').isDeltaLoading,
    isHistoryMissing: false,
    reachesBack: of('alerts').reachesBack,
  });
  (['anomalies', 'newEntity', 'riskMovers', 'newlyHighCritical'] as const).forEach((tile) =>
    hooks[DELTA_HOOKS[tile]].mockReturnValue({
      delta: 1,
      isDeltaLoading: of(tile).isDeltaLoading,
      isHistoryMissing: false,
      reachesBack: of(tile).reachesBack,
    })
  );

  hooks.useAlertBasedTilesSeries.mockReturnValue({
    alertsTrend: undefined,
    watchlistedTrend: undefined,
    isTrendLoading: false,
  });
  (['anomalies', 'newEntity'] as const).forEach((tile) =>
    hooks[SERIES_HOOKS[tile]].mockReturnValue({ trend: undefined, isTrendLoading: false })
  );
  hooks.useRiskTilesSeries.mockReturnValue({
    riskMoversTrend: undefined,
    newlyHighCriticalTrend: undefined,
    isTrendLoading: false,
  });
  hooks.useSearchedTileEntityIds.mockReturnValue({
    searchedTileEntityIds: undefined,
    isPending: false,
  });
};

const lastOptions = (hook: string) => {
  const { calls } = hooks[hook].mock;
  return calls[calls.length - 1][0];
};

const deltaIsReady = (tile: Tile): boolean => lastOptions(DELTA_HOOKS[tile]).isReady;
const seriesIsReady = (tile: Tile): boolean => lastOptions(SERIES_HOOKS[tile]).isReady;
/** What the sparkline of a tile was told about its history: the risk tiles take one each. */
const seriesReachesBack = (tile: Tile): boolean | undefined => {
  const options = lastOptions(SERIES_HOOKS[tile]);
  if (tile === 'riskMovers') return options.riskMoversReachesBack;
  if (tile === 'newlyHighCritical') return options.newlyHighCriticalReachesBack;
  return options.reachesBack;
};

describe('EntityAnalyticsNewHomePage: privileges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEntityStoreStatus as jest.Mock).mockReturnValue({
      data: { status: 'running' },
      isLoading: false,
    });
    mockTiles();
  });

  it('shows a loader and runs no query while the privileges load', () => {
    mockPrivileges({ isLoading: true });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
    expect(hooks.useNewEntityCount).not.toHaveBeenCalled();
  });

  it('shows the no-access screen and runs no query without read access to the entity store', () => {
    mockPrivileges({ hasReadPermissions: false });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(screen.getByTestId('noPrivilegesPage')).toBeInTheDocument();
    expect(hooks.useNewEntityCount).not.toHaveBeenCalled();
  });

  it('shows the page when the privileges check fails', () => {
    mockPrivileges({ isError: true });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(screen.queryByTestId('noPrivilegesPage')).not.toBeInTheDocument();
    expect(hooks.useNewEntityCount).toHaveBeenCalled();
  });

  it('shows the page when the risk engine privileges check fails', () => {
    mockPrivileges();
    (useMissingRiskEnginePrivileges as jest.Mock).mockReturnValue({
      isLoading: true,
      isError: true,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(screen.queryByRole('progressbar', { name: 'Loading' })).not.toBeInTheDocument();
    expect(hooks.useNewEntityCount).toHaveBeenCalled();
  });

  it('renders the missing privileges callout inside the padded wrapper', () => {
    mockPrivileges();
    (useMissingRiskEnginePrivileges as jest.Mock).mockReturnValue({
      isLoading: false,
      hasAllRequiredPrivileges: false,
      missingPrivileges: {
        indexPrivileges: [['risk-score.risk-score-*', ['read']]],
        clusterPrivileges: { enable: [], run: [] },
      },
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    const wrapper = screen.getByTestId('entityAnalyticsPrivilegesCalloutWrapper');
    expect(within(wrapper).getByText('Insufficient privileges')).toBeInTheDocument();
    expect(within(wrapper).getByText('risk-score.risk-score-*')).toBeInTheDocument();
  });

  it('leaves the callout wrapper empty when no privilege is missing', () => {
    mockPrivileges();
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(screen.getByTestId('entityAnalyticsPrivilegesCalloutWrapper')).toBeEmptyDOMElement();
  });

  it('titles the tiles section', () => {
    mockPrivileges();
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(screen.getByTestId('eaFaceliftNeedsAttentionTitle')).toHaveTextContent(
      'Entities that need your attention'
    );
  });

  it.each([
    ['alerts', ['alerts'], ['entitiesWithAlerts', 'watchlisted']],
    ['anomalies', ['anomalies'], ['entitiesWithAnomalies']],
    ['risk', ['riskMovers', 'newlyHighCritical'], ['riskMovers', 'newlyHighCritical']],
  ] as const)(
    'skips the %s tiles and says why without read access to them',
    (source, tiles, cardIds) => {
      mockPrivileges({ [source]: false });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      TILES.forEach((tile) => {
        const isSkipped = (tiles as readonly Tile[]).includes(tile);
        expect(lastOptions(COUNT_HOOKS[tile]).skip).toBe(isSkipped);
        expect(lastOptions(DELTA_HOOKS[tile]).skip).toBe(isSkipped);
        expect(lastOptions(SERIES_HOOKS[tile]).skip).toBe(isSkipped);
      });
      cardIds.forEach((id) => {
        expect(getCard(id)?.countIssue).toEqual({
          kind: 'locked',
          text: expect.stringMatching(/^Requires read access to /),
        });
      });
    }
  );
});

describe('EntityAnalyticsNewHomePage: alerts feature privilege', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivileges();
    (useEntityStoreStatus as jest.Mock).mockReturnValue({
      data: { status: 'running' },
      isLoading: false,
    });
    mockTiles();
  });

  afterEach(() => {
    mockUrlStateOverrides = {};
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
  });

  it('skips the alert tiles and says why when Alerts is None but the alerts index is readable', () => {
    mockPrivileges({ alerts: true, alertsFeature: false });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    [COUNT_HOOKS.alerts, DELTA_HOOKS.alerts, SERIES_HOOKS.alerts].forEach((hook) => {
      expect(lastOptions(hook).skip).toBe(true);
    });
    ['entitiesWithAlerts', 'watchlisted'].forEach((id) => {
      expect(getCard(id as SignalCardData['id'])?.countIssue).toEqual({
        kind: 'locked',
        text: 'Requires read access to alerts',
      });
    });
    // The grid drops the Alerts columns (and so their count and click path) for this role.
    const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
    expect(gridCalls[gridCalls.length - 1][0].readAccess.alerts).toBe(false);
  });

  it('warns in the privileges callout when only the Alerts feature privilege is missing', () => {
    mockPrivileges({ alerts: true, alertsFeature: false });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    const wrapper = screen.getByTestId('entityAnalyticsPrivilegesCalloutWrapper');
    expect(within(wrapper).getByText('Insufficient privileges')).toBeInTheDocument();
    expect(within(wrapper).getByText('Alerts')).toBeInTheDocument();
  });

  it('keeps the alert tiles on when Alerts and the alerts index are both readable', () => {
    mockPrivileges({ alerts: true, alertsFeature: true });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(lastOptions(COUNT_HOOKS.alerts).skip).toBe(false);
    expect(getCard('entitiesWithAlerts')?.countIssue).toBeUndefined();
    const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
    expect(gridCalls[gridCalls.length - 1][0].readAccess.alerts).toBe(true);
  });

  it('lets the flat grid report its loads, with no tile filter or entity filters on', () => {
    mockPrivileges();
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
    expect(gridCalls[gridCalls.length - 1][0].loadTelemetry).toEqual({
      runKey: expect.any(String),
      isFilterPending: false,
      hasTileFilter: false,
      hasEntityFilters: false,
    });
  });

  it('keys a grid load on the search as typed, and holds it while its overrides resolve', () => {
    mockPrivileges();
    const loadTelemetry = () => {
      const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
      return gridCalls[gridCalls.length - 1][0].loadTelemetry;
    };
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'entity.name == "a"',
      rawSearchExpression: 'entity.name == "a"',
      isSearchOverridesPending: true,
      applicableFilters: [],
      ignoredFields: [],
    });
    const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    const { runKey, isFilterPending } = loadTelemetry();
    expect(isFilterPending).toBe(true);

    // The overrides arrive and patch the expression: the same load, now free to settle.
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: '(entity.name == "a" AND NOT entity.id IN ("x")) OR entity.id IN ("y")',
      rawSearchExpression: 'entity.name == "a"',
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    rerender(<EntityAnalyticsNewHomePage />);
    expect(loadTelemetry()).toMatchObject({ runKey, isFilterPending: false });

    (useSearchBarExpression as jest.Mock).mockReturnValue({
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
  });

  describe('the key of a grid load', () => {
    const lastLoadTelemetry = () => {
      const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
      return gridCalls[gridCalls.length - 1][0].loadTelemetry;
    };
    const runKeyWith = (overrides: Record<string, unknown>): string => {
      jest.clearAllMocks();
      mockUrlStateOverrides = overrides;
      mockTiles();
      const { unmount } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      const { runKey } = lastLoadTelemetry();
      unmount();
      return runKey;
    };

    it('is stable for the same request', () => {
      expect(runKeyWith({})).toBe(runKeyWith({}));
    });

    it.each([
      ['rows mode', { rowsMode: 'resolved' }],
      ['sort field', { sortField: 'entity.name' }],
      ['sort direction', { sortDirection: 'asc' }],
      ['entity filters', { entityFilters: { ...EMPTY_ENTITY_FILTERS, entityTypes: ['host'] } }],
      ['tile', { activeTile: 'newEntity' }],
      ['time range', { timeRange: '30d' }],
    ])('changes with the %s, so the new load is reported', (_name, overrides) => {
      expect(runKeyWith(overrides)).not.toBe(runKeyWith({}));
    });

    it('changes with the search as typed', () => {
      const keyOfSearch = (rawSearchExpression?: string): string => {
        (useSearchBarExpression as jest.Mock).mockReturnValue({
          rawSearchExpression,
          isSearchOverridesPending: false,
          applicableFilters: [],
          ignoredFields: [],
        });
        return runKeyWith({});
      };
      const keyWithoutSearch = keyOfSearch(undefined);
      expect(keyOfSearch('entity.name == "a"')).not.toBe(keyWithoutSearch);
    });
  });

  describe('a tile with more entities than the table is filtered by', () => {
    const manyIds = Array.from({ length: 1423 }, (_, i) => `entity-${i}`);
    const lastGridProps = () => {
      const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
      return gridCalls[gridCalls.length - 1][0];
    };
    const selectBigTile = () => {
      mockUrlStateOverrides = { activeTile: 'newEntity' };
      hooks.useNewEntityCount.mockReturnValue({
        count: manyIds.length,
        entityIds: manyIds,
        hasCount: true,
        isLoading: false,
        isMissingIndex: false,
        isCountPending: false,
      });
    };

    it('tells the grid how many entities the tile has, for the resolved rows', () => {
      mockRowsMode = 'resolved';
      selectBigTile();
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(lastGridProps().cappedTile).toEqual({ total: 1423, limit: 1000 });
    });

    it('warns with the numbers written out, 1,000 of 1,423', () => {
      mockRowsMode = 'resolved';
      selectBigTile();
      mockAddWarning.mockClear();
      const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      // The warning fires when the selection changes, so change it by one entity.
      hooks.useNewEntityCount.mockReturnValue({
        count: manyIds.length + 1,
        entityIds: [...manyIds, 'entity-extra'],
        hasCount: true,
        isLoading: false,
        isMissingIndex: false,
        isCountPending: false,
      });
      rerender(<EntityAnalyticsNewHomePage />);

      expect(mockAddWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Table shows 1,000 of 1,424 entities',
          text: expect.stringContaining('limited to 1,000 entities'),
        })
      );
    });

    it('says nothing of it for individual records, which are a different count', () => {
      mockRowsMode = 'individual';
      selectBigTile();
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(lastGridProps().cappedTile).toBeUndefined();
    });

    it('says nothing of it while the tile fits the table', () => {
      mockRowsMode = 'resolved';
      selectBigTile();
      hooks.useNewEntityCount.mockReturnValue({
        count: 1000,
        entityIds: manyIds.slice(0, 1000),
        hasCount: true,
        isLoading: false,
        isMissingIndex: false,
        isCountPending: false,
      });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(lastGridProps().cappedTile).toBeUndefined();
    });
  });

  it('holds the load while the active tile is loading, and releases it once it settles', () => {
    mockUrlStateOverrides = { activeTile: 'newEntity' };
    const loadingTile = {
      count: 3,
      entityIds: [],
      hasCount: true,
      isLoading: true,
      isMissingIndex: false,
      isCountPending: false,
    };
    hooks.useNewEntityCount.mockReturnValue(loadingTile);
    const loadTelemetry = () => {
      const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
      return gridCalls[gridCalls.length - 1][0].loadTelemetry;
    };
    const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    const { runKey } = loadTelemetry();
    expect(loadTelemetry()).toMatchObject({ isFilterPending: true, hasTileFilter: true });

    hooks.useNewEntityCount.mockReturnValue({ ...loadingTile, isLoading: false });
    rerender(<EntityAnalyticsNewHomePage />);
    expect(loadTelemetry()).toMatchObject({ runKey, isFilterPending: false });
  });
});

describe('EntityAnalyticsNewHomePage: each tile waits for its own count', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrivileges();
    (useEntityStoreStatus as jest.Mock).mockReturnValue({
      data: { status: 'running' },
      isLoading: false,
    });
  });

  it('releases and runs every delta and sparkline once all the counts have settled and the store runs', () => {
    mockTiles();
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    TILES.forEach((tile) => {
      expect(deltaIsReady(tile)).toBe(true);
      expect(lastOptions(DELTA_HOOKS[tile]).skip).toBe(false);
      expect(lastOptions(SERIES_HOOKS[tile]).skip).toBe(false);
    });
  });

  it.each(TILES)(
    'holds back only the delta and sparkline of the %s tile while its count is pending',
    (stuck) => {
      mockTiles({ [stuck]: { isCountPending: true } });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      // The two risk tiles share one sparkline query, which waits for both counts.
      const isRisk = (tile: Tile) => tile === 'riskMovers' || tile === 'newlyHighCritical';
      TILES.forEach((tile) => {
        expect(deltaIsReady(tile)).toBe(tile !== stuck);
        expect(seriesIsReady(tile)).toBe(!(tile === stuck || (isRisk(tile) && isRisk(stuck))));
      });
    }
  );

  it.each(['installing', 'not_installed', 'stopped'])(
    'skips every delta and sparkline while the entity store is %s',
    (status) => {
      (useEntityStoreStatus as jest.Mock).mockReturnValue({ data: { status }, isLoading: false });
      mockTiles();
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      TILES.forEach((tile) => {
        expect(lastOptions(DELTA_HOOKS[tile]).skip).toBe(true);
        expect(lastOptions(SERIES_HOOKS[tile]).skip).toBe(true);
      });
    }
  );

  describe('the sparklines follow the deltas', () => {
    it.each(TILES)(
      'hold back only the sparkline that reads the %s delta until it has loaded',
      (loading) => {
        mockTiles({ [loading]: { isDeltaLoading: true } });
        render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

        // The two risk tiles share one sparkline query, which waits for both deltas.
        const isRisk = (tile: Tile) => tile === 'riskMovers' || tile === 'newlyHighCritical';
        TILES.forEach((tile) =>
          expect(seriesIsReady(tile)).toBe(!(tile === loading || (isRisk(tile) && isRisk(loading))))
        );
      }
    );

    it.each(TILES)('pass the history result of the %s delta on to its sparkline', (tile) => {
      mockTiles({ [tile]: { reachesBack: false } });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      expect(seriesReachesBack(tile)).toBe(false);

      jest.clearAllMocks();
      mockTiles({ [tile]: { reachesBack: undefined } });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      expect(seriesReachesBack(tile)).toBeUndefined();
    });
  });

  it('says the alert tiles need detection alerts in a space with no alerts index', () => {
    mockTiles();
    hooks.useAlertBasedTiles.mockReturnValue({
      severeAlertsCount: 0,
      severeAlertsEntityIds: [],
      watchlistedCount: 0,
      watchlistedEntityIds: [],
      hasCount: false,
      isLoading: false,
      isCountPending: false,
      isTimedOut: false,
      isMissingIndex: true,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(getCard('entitiesWithAlerts')?.countIssue).toEqual(
      expect.objectContaining({ kind: 'issue', text: 'Requires an alerts index' })
    );
    expect(getCard('watchlisted')?.countIssue).toEqual(
      expect.objectContaining({ kind: 'issue', text: 'Requires an alerts index' })
    );
    expect(getCard('entitiesWithAlerts')?.isUnavailable).toBe(true);
    expect(getCard('newEntity')?.countIssue).toBeUndefined();
  });

  describe('when a count times out', () => {
    it('says so on its tiles, warns once for the page, and reports the timeout', () => {
      mockTiles();
      hooks.useAlertBasedTiles.mockReturnValue({
        severeAlertsCount: 0,
        severeAlertsEntityIds: [],
        watchlistedCount: 0,
        watchlistedEntityIds: [],
        isLoading: false,
        isCountPending: false,
        isTimedOut: true,
      });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      const issueOf = (id: SignalCardData['id']) => getCard(id)?.countIssue;
      expect(issueOf('entitiesWithAlerts')).toEqual(
        expect.objectContaining({ kind: 'issue', icon: 'error', text: 'Query timed out' })
      );
      expect(issueOf('watchlisted')).toEqual(
        expect.objectContaining({ kind: 'issue', icon: 'error', text: 'Query timed out' })
      );
      expect(issueOf('newEntity')).toBeUndefined();
      expect(lastOptions('useTilesTimeoutNotice')).toBe(true);
      expect(lastOptions('useTilesLoadTelemetry').tiles.alerts.isTimedOut).toBe(true);
    });

    it('warns for nothing when no count timed out', () => {
      mockTiles();
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      expect(lastOptions('useTilesTimeoutNotice')).toBeFalsy();
    });
  });

  describe('when a count fails', () => {
    const lastErrorNotice = () => {
      const { calls } = hooks.useTilesErrorNotice.mock;
      return calls[calls.length - 1];
    };

    it('names every tile that failed in one notice, once the counts have settled', () => {
      mockTiles();
      hooks.useAlertBasedTiles.mockReturnValue({
        ...hooks.useAlertBasedTiles(),
        hasCount: false,
        error: new Error('boom'),
      });
      hooks.useNewEntityCount.mockReturnValue({
        ...hooks.useNewEntityCount(),
        hasCount: false,
        error: new Error('boom'),
      });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      const [titles, isSettled] = lastErrorNotice();
      expect(titles).toEqual(['Severely alerting', 'New & alerting', 'Watchlisted & alerting']);
      expect(isSettled).toBe(true);
    });

    it('does not name a tile that timed out, which has its own notice', () => {
      mockTiles();
      hooks.useNewEntityCount.mockReturnValue({
        ...hooks.useNewEntityCount(),
        hasCount: false,
        error: new Error('boom'),
        isTimedOut: true,
      });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(lastErrorNotice()[0]).toEqual([]);
      expect(lastOptions('useTilesTimeoutNotice')).toBe(true);
    });

    it('names nothing, and has not settled, while a count still loads', () => {
      mockTiles({ alerts: { isCountPending: true } });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(lastErrorNotice()[0]).toEqual([]);
    });
  });

  it("runs a tile's delta for a count of 0 that came back, but not for a count that did not", () => {
    mockTiles();
    hooks.useNewEntityCount.mockReturnValue({
      ...hooks.useNewEntityCount(),
      count: 0,
      hasCount: true,
    });
    hooks.useRiskMoversCount.mockReturnValue({
      ...hooks.useRiskMoversCount(),
      count: 0,
      hasCount: false,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(lastOptions(DELTA_HOOKS.newEntity).hasCount).toBe(true);
    expect(lastOptions(DELTA_HOOKS.riskMovers).hasCount).toBe(false);
    // The sparklines are told the same, so a count that did not come back draws no line.
    expect(lastOptions(SERIES_HOOKS.newEntity).hasCount).toBe(true);
    expect(lastOptions(SERIES_HOOKS.riskMovers).riskMoversHasCount).toBe(false);
  });

  it('passes whether each count has a result to its tile, so a missing count is not shown as 0', () => {
    mockTiles();
    hooks.useRiskMoversCount.mockReturnValue({
      ...hooks.useRiskMoversCount(),
      count: 0,
      hasCount: false,
    });
    hooks.useNewlyHighCriticalCount.mockReturnValue({
      ...hooks.useNewlyHighCriticalCount(),
      count: 0,
      hasCount: true,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(getCard('riskMovers')).toEqual(expect.objectContaining({ value: 0, hasCount: false }));
    expect(getCard('newlyHighCritical')).toEqual(
      expect.objectContaining({ value: 0, hasCount: true })
    );
    expect(getCard('newEntity')).toEqual(expect.objectContaining({ hasCount: true }));
  });

  it('tells the anomalies tile that it needs jobs only when no security ML job is installed', () => {
    const anomaliesIssueText = () => {
      const issue = getCard('entitiesWithAnomalies')?.countIssue;
      return issue?.kind === 'issue' ? issue.text : undefined;
    };
    mockTiles({}, { anomaliesMissingJobs: true });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    expect(anomaliesIssueText()).toBe('Requires anomaly detection jobs');

    jest.clearAllMocks();
    mockTiles({}, { anomaliesMissingJobs: false });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    expect(anomaliesIssueText()).toBeUndefined();
  });
});

describe('EntityAnalyticsNewHomePage: the search narrows the tiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRowsMode = 'resolved';
    mockPrivileges();
    (useEntityStoreStatus as jest.Mock).mockReturnValue({
      data: { status: 'running' },
      isLoading: false,
    });
    mockTiles();
  });

  it('also drops a failed comparison and a loading sparkline for the searched tiles', () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("host.name: a")',
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    hooks.useSearchedTileEntityIds.mockReturnValue({
      searchedTileEntityIds: {
        entitiesWithAlerts: ['host:a'],
        entitiesWithAnomalies: [],
        riskMovers: [],
        newlyHighCritical: [],
        watchlisted: [],
        newEntity: [],
      },
      isPending: false,
    });
    // The unfiltered comparison failed and its sparkline is still loading: neither applies to a
    // tile that now counts only the searched entities.
    hooks.useAlertBasedTilesDelta.mockReturnValue({
      ...hooks.useAlertBasedTilesDelta(),
      failure: 'delta',
    });
    hooks.useAlertBasedTilesSeries.mockReturnValue({
      alertsTrend: undefined,
      watchlistedTrend: undefined,
      isTrendLoading: true,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(getCard('entitiesWithAlerts')?.deltaFailure).toBeUndefined();
    expect(getCard('entitiesWithAlerts')?.isTrendLoading).toBe(false);
  });

  it("shows each tile's searched entities, without its delta and sparkline", () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("host.name: a")',
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    hooks.useSearchedTileEntityIds.mockReturnValue({
      searchedTileEntityIds: {
        entitiesWithAlerts: ['host:a'],
        entitiesWithAnomalies: [],
        riskMovers: [],
        newlyHighCritical: [],
        watchlisted: [],
        newEntity: [],
      },
      isPending: false,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(lastOptions('useSearchedTileEntityIds').searchExpression).toBe('KQL("host.name: a")');
    expect(getCard('entitiesWithAlerts')).toMatchObject({
      value: 1,
      delta: undefined,
      isDeltaLoading: false,
      isDeltaUnavailable: false,
      trend: undefined,
    });
    expect(getCard('entitiesWithAnomalies')?.value).toBe(0);
  });

  it('warns once per search that matches main entities only', () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("bob")',
      isSearchOverridesPending: false,
      mainEntityOnlySearch: 'KQL("bob")',
      applicableFilters: [],
      ignoredFields: [],
    });
    const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    rerender(<EntityAnalyticsNewHomePage />);

    expect(mockAddWarning).toHaveBeenCalledTimes(1);
  });

  it('gives the brief the searched count and entities of each tile', () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("host.name: a")',
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    hooks.useSearchedTileEntityIds.mockReturnValue({
      searchedTileEntityIds: {
        entitiesWithAlerts: ['host:a'],
        entitiesWithAnomalies: [],
        riskMovers: [],
        newlyHighCritical: [],
        watchlisted: [],
        newEntity: [],
      },
      isPending: false,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(getBriefCard('entitiesWithAlerts')).toMatchObject({
      value: 1,
      entityIds: ['host:a'],
      delta: undefined,
    });
  });

  it('leaves the tiles as they are on individual rows, which show the aliases the search matches', () => {
    mockRowsMode = 'individual';
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("host.name: a")',
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(lastOptions('useSearchedTileEntityIds').searchExpression).toBeUndefined();
    expect(getCard('entitiesWithAlerts')).toMatchObject({ value: 5, delta: 1 });
  });

  it('keeps the counts, deltas and sparklines without a search', () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(getCard('entitiesWithAlerts')).toMatchObject({ value: 5, delta: 1 });
  });

  it('loads the tiles while the search is checked', () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("host.name: a")',
      isSearchOverridesPending: false,
      applicableFilters: [],
      ignoredFields: [],
    });
    hooks.useSearchedTileEntityIds.mockReturnValue({
      searchedTileEntityIds: undefined,
      isPending: true,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(getCard('entitiesWithAlerts')?.isLoading).toBe(true);
  });

  it('waits for the search overrides before it checks the tiles, and loads them meanwhile', () => {
    (useSearchBarExpression as jest.Mock).mockReturnValue({
      searchExpression: 'KQL("asset.criticality: low_impact")',
      isSearchOverridesPending: true,
      applicableFilters: [],
      ignoredFields: [],
    });
    hooks.useSearchedTileEntityIds.mockReturnValue({
      searchedTileEntityIds: undefined,
      isPending: true,
    });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    expect(lastOptions('useSearchedTileEntityIds').isReady).toBe(false);
    expect(getCard('entitiesWithAlerts')?.isLoading).toBe(true);
  });

  describe('the callout on the ignored filters', () => {
    const CALLOUT = 'entity-analytics-ignored-filters-callout';
    const mockIgnoredFields = (ignoredFields: string[]) =>
      (useSearchBarExpression as jest.Mock).mockReturnValue({
        isSearchOverridesPending: false,
        applicableFilters: [],
        ignoredFields,
      });

    it('is not shown when no filter was ignored', () => {
      mockIgnoredFields([]);
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(screen.queryByTestId(CALLOUT)).not.toBeInTheDocument();
    });

    it('is shown with the ignored fields, and hidden once dismissed', () => {
      mockIgnoredFields(['kibana.alert.workflow_status']);
      const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      expect(screen.getByTestId(CALLOUT)).toHaveTextContent('kibana.alert.workflow_status');

      fireEvent.click(within(screen.getByTestId(CALLOUT)).getByRole('button'));
      expect(screen.queryByTestId(CALLOUT)).not.toBeInTheDocument();

      rerender(<EntityAnalyticsNewHomePage />);
      expect(screen.queryByTestId(CALLOUT)).not.toBeInTheDocument();
    });

    it('stays hidden when an ignored field is removed after the dismiss', () => {
      mockIgnoredFields(['kibana.alert.workflow_status']);
      const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      fireEvent.click(within(screen.getByTestId(CALLOUT)).getByRole('button'));

      mockIgnoredFields(['kibana.alert.workflow_status', 'kibana.alert.severity']);
      rerender(<EntityAnalyticsNewHomePage />);
      expect(screen.getByTestId(CALLOUT)).toBeInTheDocument();
      fireEvent.click(within(screen.getByTestId(CALLOUT)).getByRole('button'));

      mockIgnoredFields(['kibana.alert.workflow_status']);
      rerender(<EntityAnalyticsNewHomePage />);

      expect(screen.queryByTestId(CALLOUT)).not.toBeInTheDocument();
    });

    it('is shown again when a dismissed field is removed and added back', () => {
      mockIgnoredFields(['kibana.alert.workflow_status']);
      const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      fireEvent.click(within(screen.getByTestId(CALLOUT)).getByRole('button'));

      mockIgnoredFields([]);
      rerender(<EntityAnalyticsNewHomePage />);
      mockIgnoredFields(['kibana.alert.workflow_status']);
      rerender(<EntityAnalyticsNewHomePage />);

      expect(screen.getByTestId(CALLOUT)).toBeInTheDocument();
    });

    it('is shown again for other ignored fields', () => {
      mockIgnoredFields(['kibana.alert.workflow_status']);
      const { rerender } = render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      fireEvent.click(within(screen.getByTestId(CALLOUT)).getByRole('button'));

      mockIgnoredFields(['kibana.alert.severity']);
      rerender(<EntityAnalyticsNewHomePage />);

      expect(screen.getByTestId(CALLOUT)).toHaveTextContent('kibana.alert.severity');
    });
  });
});
