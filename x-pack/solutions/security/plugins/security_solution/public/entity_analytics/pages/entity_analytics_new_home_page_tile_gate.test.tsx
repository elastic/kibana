/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { EntityAnalyticsNewHomePage } from './entity_analytics_new_home_page';
import * as tileHooks from '../components/home/needs_attention_tiles/hooks';
import { useEntityStoreStatus } from '../components/entity_store/hooks/use_entity_store';

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
  EntitiesGrid: () => null,
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
  SignalCards: () => null,
}));
jest.mock('../components/home/entities_table', () => ({
  DataViewContext: { Provider: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  useEntityURLState: () => ({ onChangePage: jest.fn(), query: undefined }),
  DEFAULT_ENTITIES_TABLE_CONFIG: {},
  DEFAULT_ENTITIES_TABLE_SORT: {},
  EntitiesTableSection: () => null,
}));
jest.mock('./entity_analytics_home_header', () => ({ EntityAnalyticsHomeHeader: () => null }));
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

const hooks = tileHooks as unknown as Record<string, jest.Mock>;

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
const mockTiles = (state: Partial<Record<Tile, Partial<TileState>>> = {}) => {
  const of = (tile: Tile): TileState => ({ ...settledTile, ...state[tile] });

  hooks.useAlertBasedTiles.mockReturnValue({
    severeAlertsCount: 5,
    severeAlertsEntityIds: [],
    watchlistedCount: 2,
    watchlistedEntityIds: [],
    isLoading: false,
    isCountPending: of('alerts').isCountPending,
  });
  const count = (tile: Tile) => ({
    count: 3,
    entityIds: [],
    isLoading: false,
    isMissingIndex: false,
    isCountPending: of(tile).isCountPending,
  });
  hooks.useEntitiesWithAnomaliesCount.mockReturnValue(count('anomalies'));
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

describe('EntityAnalyticsNewHomePage: the tiles wait for every count', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    'holds all the deltas and sparklines back while the %s count is pending',
    (stuck) => {
      mockTiles({ [stuck]: { isCountPending: true } });
      render(<EntityAnalyticsNewHomePage />, { wrapper: TestProviders });

      TILES.forEach((tile) => {
        expect(deltaIsReady(tile)).toBe(false);
        expect(seriesIsReady(tile)).toBe(false);
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
});
