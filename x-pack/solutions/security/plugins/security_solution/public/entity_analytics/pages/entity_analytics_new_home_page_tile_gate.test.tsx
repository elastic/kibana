/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { EntityAnalyticsNewHomePage } from './entity_analytics_new_home_page';
import * as tileHooks from '../components/home/needs_attention_tiles/hooks';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { useEntityEnginePrivileges } from '../components/entity_store/hooks/use_entity_engine_privileges';
import { useAnomalyPrivileges } from '../api/hooks/use_anomaly_privileges';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { EntitiesGrid } from '../components/home/entities_grid/components/entities_grid';
import { SignalCards } from '../components/home/needs_attention_tiles/signal_cards';
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
  useTilesLoadTelemetry: jest.fn(),
  useTilesTimeoutNotice: jest.fn(),
  TILE_TIMEOUT_MESSAGE: 'Timed out',
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
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addWarning: jest.fn() }),
}));
jest.mock('../components/home/entities_grid/hooks/use_entity_analytics_url_state', () => ({
  useEntityAnalyticsUrlState: () => ({
    timeRange: '7d',
    setTimeRange: jest.fn(),
    entityFilters: jest.requireActual('../components/home/entities_grid/common')
      .EMPTY_ENTITY_FILTERS,
    setEntityFilters: jest.fn(),
    groupsSelected: ['none'],
    setGroupsSelected: jest.fn(),
    rowsMode: 'individual',
    setRowsMode: jest.fn(),
    sortField: 'entity.risk.calculated_score_norm',
    sortDirection: 'desc',
    setSort: jest.fn(),
    activeTile: null,
    setActiveTile: jest.fn(),
    expandedIds: [],
    toggleExpandedId: jest.fn(),
  }),
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
jest.mock('../components/home/ai_brief/generate_ai_brief_button', () => ({
  GenerateAiBriefButton: () => null,
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
        expect(getCard(id)?.noDataMessage).toMatch(/^Requires read access to /);
      });
    }
  );
});

describe('EntityAnalyticsNewHomePage: alerts feature privilege', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useEntityStoreStatus as jest.Mock).mockReturnValue({
      data: { status: 'running' },
      isLoading: false,
    });
    mockTiles();
  });

  it('skips the alert tiles and says why when Alerts is None but the alerts index is readable', () => {
    mockPrivileges({ alerts: true, alertsFeature: false });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

    [COUNT_HOOKS.alerts, DELTA_HOOKS.alerts, SERIES_HOOKS.alerts].forEach((hook) => {
      expect(lastOptions(hook).skip).toBe(true);
    });
    ['entitiesWithAlerts', 'watchlisted'].forEach((id) => {
      expect(getCard(id as SignalCardData['id'])?.noDataMessage).toBe(
        'Requires read access to alerts'
      );
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
    expect(getCard('entitiesWithAlerts')?.noDataMessage).toBeUndefined();
    const gridCalls = (EntitiesGrid as unknown as jest.Mock).mock.calls;
    expect(gridCalls[gridCalls.length - 1][0].readAccess.alerts).toBe(true);
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

      const messageOf = (id: SignalCardData['id']) => getCard(id)?.noDataMessage;
      expect(messageOf('entitiesWithAlerts')).toBe('Timed out');
      expect(messageOf('watchlisted')).toBe('Timed out');
      expect(messageOf('newEntity')).toBeUndefined();
      expect(lastOptions('useTilesTimeoutNotice')).toBe(true);
      expect(lastOptions('useTilesLoadTelemetry').tiles.alerts.isTimedOut).toBe(true);
    });

    it('warns for nothing when no count timed out', () => {
      mockTiles();
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
      expect(lastOptions('useTilesTimeoutNotice')).toBeFalsy();
    });
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
    const anomaliesNoDataMessage = () => getCard('entitiesWithAnomalies')?.noDataMessage;
    mockTiles({}, { anomaliesMissingJobs: true });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    expect(anomaliesNoDataMessage()).toBe('Requires anomaly detection jobs');

    jest.clearAllMocks();
    mockTiles({}, { anomaliesMissingJobs: false });
    render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });
    expect(anomaliesNoDataMessage()).toBeUndefined();
  });
});
