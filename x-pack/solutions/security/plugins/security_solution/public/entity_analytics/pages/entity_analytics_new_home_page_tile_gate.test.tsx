/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
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
  useEntityStoreDataView: () => ({ dataView: {}, isLoading: false, error: undefined }),
}));
jest.mock('../api/hooks/use_get_watchlists', () => ({
  useGetWatchlists: () => ({ data: [], error: undefined }),
}));
jest.mock('../../common/hooks/use_error_toast', () => ({ useErrorToast: jest.fn() }));
jest.mock('../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({ addWarning: jest.fn() }),
}));
jest.mock('../components/home/use_time_range_param', () => ({
  useTimeRangeParam: () => ['7d', jest.fn()],
}));
jest.mock('../components/home/use_entity_filters_param', () => ({
  useEntityFiltersParam: () => ({ entityFilters: {}, setEntityFilters: jest.fn() }),
  getEntityFilterTerms: () => [],
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

  it('releases every delta once all the counts have settled', () => {
    mockTiles();
    render(<EntityAnalyticsNewHomePage />);

    TILES.forEach((tile) => expect(deltaIsReady(tile)).toBe(true));
  });

  it.each(TILES)(
    'holds all the deltas and sparklines back while the %s count is pending',
    (stuck) => {
      mockTiles({ [stuck]: { isCountPending: true } });
      render(<EntityAnalyticsNewHomePage />);

      TILES.forEach((tile) => {
        expect(deltaIsReady(tile)).toBe(false);
        expect(seriesIsReady(tile)).toBe(false);
      });
    }
  );

  it.each(TILES)(
    'releases them all when the pending %s count settles, whether it was skipped, failed or loaded',
    (stuck) => {
      mockTiles({ [stuck]: { isCountPending: true } });
      const { rerender } = render(<EntityAnalyticsNewHomePage />);
      TILES.forEach((tile) => expect(deltaIsReady(tile)).toBe(false));

      // A count that cannot run, or has failed, reports that it is no longer pending.
      mockTiles({ [stuck]: { isCountPending: false } });
      rerender(<EntityAnalyticsNewHomePage />);

      TILES.forEach((tile) => expect(deltaIsReady(tile)).toBe(true));
    }
  );

  it.each(['installing', 'not_installed', 'stopped'])(
    'skips every delta and sparkline while the entity store is %s',
    (status) => {
      (useEntityStoreStatus as jest.Mock).mockReturnValue({ data: { status }, isLoading: false });
      mockTiles();
      render(<EntityAnalyticsNewHomePage />);

      TILES.forEach((tile) => {
        expect(lastOptions(DELTA_HOOKS[tile]).skip).toBe(true);
        expect(lastOptions(SERIES_HOOKS[tile]).skip).toBe(true);
      });
    }
  );

  it('does not skip them while the entity store is running', () => {
    mockTiles();
    render(<EntityAnalyticsNewHomePage />);

    TILES.forEach((tile) => {
      expect(lastOptions(DELTA_HOOKS[tile]).skip).toBe(false);
      expect(lastOptions(SERIES_HOOKS[tile]).skip).toBe(false);
    });
  });

  describe('the sparklines follow the deltas', () => {
    it('hold a sparkline back until its own delta has loaded, and release the others', () => {
      mockTiles({ anomalies: { isDeltaLoading: true } });
      render(<EntityAnalyticsNewHomePage />);

      expect(seriesIsReady('anomalies')).toBe(false);
      TILES.filter((tile) => tile !== 'anomalies').forEach((tile) =>
        expect(seriesIsReady(tile)).toBe(true)
      );
    });

    it.each(['riskMovers', 'newlyHighCritical'] as const)(
      'hold the one risk sparkline query back while the %s delta is loading',
      (loading) => {
        mockTiles({ [loading]: { isDeltaLoading: true } });
        render(<EntityAnalyticsNewHomePage />);

        expect(seriesIsReady('riskMovers')).toBe(false);
        expect(seriesIsReady('newlyHighCritical')).toBe(false);
        (['alerts', 'anomalies', 'newEntity'] as const).forEach((tile) =>
          expect(seriesIsReady(tile)).toBe(true)
        );
      }
    );

    it.each(TILES)('pass the history result of the %s delta on to its sparkline', (tile) => {
      mockTiles({ [tile]: { reachesBack: false } });
      render(<EntityAnalyticsNewHomePage />);
      expect(seriesReachesBack(tile)).toBe(false);

      jest.clearAllMocks();
      mockTiles({ [tile]: { reachesBack: undefined } });
      render(<EntityAnalyticsNewHomePage />);
      expect(seriesReachesBack(tile)).toBeUndefined();
    });
  });
});
