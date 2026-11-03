/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { of } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../../common/lib/kibana';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import type { EntityFilters } from '../../entities_grid/common';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import {
  severeAlertsSeriesColumn,
  watchlistedSeriesColumn,
} from '../queries/entities_with_alerts_series_query';
import { anomaliesSeriesColumn } from '../queries/entities_with_anomalies_series_query';
import { newEntitySeriesColumn } from '../queries/new_entity_series_query';
import {
  newlyHighCriticalSeriesColumn,
  riskMoversSeriesColumn,
} from '../queries/risk_series_query';
import { useAlertBasedTilesSeries } from './use_alert_based_tiles_series';
import { useEntitiesWithAnomaliesSeries } from './use_entities_with_anomalies_series';
import { useNewEntitySeries } from './use_new_entity_series';
import { useRiskTilesSeries } from './use_risk_tiles_series';
import { useTileQueryInputs } from './use_tile_query_inputs';

jest.mock('@kbn/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../../../../../common/lib/kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));
jest.mock('./use_tile_query_inputs', () => ({ useTileQueryInputs: jest.fn() }));

/*
 * The four series hooks are thin wrappers over `getSeriesGate`, `getTileTrend` and
 * `useTileSeriesQuery`, which have their own tests. What each hook can still get wrong is the
 * wiring: which count, history flag, column and filter goes to which tile. Every hook is held to
 * the same contract below, and the few rules only one hook has come after it.
 */

const mockUseQuery = useQuery as jest.Mock;
const mockSearch = jest.fn();
const mockIndex = useResolvedLatestEntitiesIndexName as jest.Mock;
const mockJobs = useInstalledSecurityJobsIds as jest.Mock;

const RANGE = '24h';
const DOT_COUNT = 6;
const DOTS = Array.from({ length: DOT_COUNT }, (_, i) => 10 + i);

interface TileGate {
  count: number;
  reachesBack: boolean | undefined;
}
interface RunOptions {
  isReady: boolean;
  skip?: boolean;
  entityFilters?: EntityFilters;
  /** One per tile the hook draws. */
  tiles: TileGate[];
}
interface RunResult {
  trends: Array<number[] | undefined>;
  isTrendLoading: boolean;
}
interface HookCase {
  name: string;
  tileKey: string;
  tileCount: number;
  /** The column of dot k of each tile. */
  columns: Array<(k: number) => string>;
  /** The data the query returns, built from the dots of each tile. */
  toQueryData: (dotsOfTiles: number[][]) => unknown;
  /** The dots of each tile, read from what the query function returns. */
  fromParsed: (parsed: unknown) => number[][];
  clausesOf: (entityFilters: EntityFilters) => string[];
  run: (options: RunOptions) => RunResult;
}

const HOOKS: readonly HookCase[] = [
  {
    name: 'alerts',
    tileKey: 'alertBasedTilesSeries',
    tileCount: 2,
    columns: [severeAlertsSeriesColumn, watchlistedSeriesColumn],
    toQueryData: ([severe, watchlisted]) => ({ severe, watchlisted }),
    fromParsed: (parsed) => {
      const { severe, watchlisted } = parsed as { severe: number[]; watchlisted: number[] };
      return [severe, watchlisted];
    },
    clausesOf: buildEntityFilterClauses,
    run: ({ isReady, skip, entityFilters, tiles: [severe, watchlisted] }) => {
      const { alertsTrend, watchlistedTrend, isTrendLoading } = renderHook(() =>
        useAlertBasedTilesSeries({
          spaceId: 'default',
          timeRange: RANGE,
          isReady,
          skip,
          entityFilters,
          reachesBack: severe.reachesBack,
          severeAlertsCount: severe.count,
          watchlistedCount: watchlisted.count,
        })
      ).result.current;
      return { trends: [alertsTrend, watchlistedTrend], isTrendLoading };
    },
  },
  {
    name: 'anomalies',
    tileKey: 'entitiesWithAnomaliesSeries',
    tileCount: 1,
    columns: [anomaliesSeriesColumn],
    toQueryData: ([dots]) => dots,
    fromParsed: (parsed) => [parsed as number[]],
    clausesOf: buildEntityFilterClauses,
    run: ({ isReady, skip, entityFilters, tiles: [tile] }) => {
      const { trend, isTrendLoading } = renderHook(() =>
        useEntitiesWithAnomaliesSeries({
          spaceId: 'default',
          timeRange: RANGE,
          isReady,
          skip,
          entityFilters,
          reachesBack: tile.reachesBack,
          count: tile.count,
        })
      ).result.current;
      return { trends: [trend], isTrendLoading };
    },
  },
  {
    name: 'new entity',
    tileKey: 'newEntitySeries',
    tileCount: 1,
    columns: [newEntitySeriesColumn],
    toQueryData: ([dots]) => dots,
    fromParsed: (parsed) => [parsed as number[]],
    clausesOf: buildEntityFilterClauses,
    run: ({ isReady, skip, entityFilters, tiles: [tile] }) => {
      const { trend, isTrendLoading } = renderHook(() =>
        useNewEntitySeries({
          spaceId: 'default',
          timeRange: RANGE,
          isReady,
          skip,
          entityFilters,
          reachesBack: tile.reachesBack,
          count: tile.count,
        })
      ).result.current;
      return { trends: [trend], isTrendLoading };
    },
  },
  {
    name: 'risk',
    tileKey: 'riskTilesSeries',
    tileCount: 2,
    columns: [riskMoversSeriesColumn, newlyHighCriticalSeriesColumn],
    toQueryData: ([riskMovers, newlyHighCritical]) => ({ riskMovers, newlyHighCritical }),
    fromParsed: (parsed) => {
      const { riskMovers, newlyHighCritical } = parsed as {
        riskMovers: number[];
        newlyHighCritical: number[];
      };
      return [riskMovers, newlyHighCritical];
    },
    clausesOf: buildEntityFilterClauses,
    run: ({ isReady, skip, entityFilters, tiles: [riskMovers, newlyHighCritical] }) => {
      const { riskMoversTrend, newlyHighCriticalTrend, isTrendLoading } = renderHook(() =>
        useRiskTilesSeries({
          spaceId: 'default',
          timeRange: RANGE,
          isReady,
          skip,
          entityFilters,
          riskMoversReachesBack: riskMovers.reachesBack,
          newlyHighCriticalReachesBack: newlyHighCritical.reachesBack,
          riskMoversCount: riskMovers.count,
          newlyHighCriticalCount: newlyHighCritical.count,
        })
      ).result.current;
      return { trends: [riskMoversTrend, newlyHighCriticalTrend], isTrendLoading };
    },
  },
];

const TWO_TILE_HOOKS = HOOKS.filter(({ tileCount }) => tileCount === 2);
const [, ANOMALIES, NEW_ENTITY, RISK] = HOOKS;

/** Tile t counts 4 + t, and draws dots offset by 100 * t, so a swapped tile shows. */
const settledTiles = (hook: HookCase): TileGate[] =>
  Array.from({ length: hook.tileCount }, (_, t) => ({ count: 4 + t, reachesBack: true }));
const dotsOfTiles = (hook: HookCase): number[][] =>
  Array.from({ length: hook.tileCount }, (_, t) => DOTS.map((dot) => dot + 100 * t));

const queryResult = (overrides = {}) => ({
  data: undefined,
  isFetching: false,
  isError: false,
  ...overrides,
});
const lastCall = () => mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1];
const isEnabled = (): boolean => lastCall()[2].enabled;

const run = (hook: HookCase, overrides: Partial<RunOptions> = {}): RunResult =>
  hook.run({ isReady: true, tiles: settledTiles(hook), ...overrides });
const runAll = (hook: HookCase, tile: TileGate, overrides: Partial<RunOptions> = {}): RunResult =>
  run(hook, { tiles: settledTiles(hook).map(() => tile), ...overrides });

const NO_LINES = (hook: HookCase): RunResult => ({
  trends: hook.columns.map(() => undefined),
  isTrendLoading: false,
});

describe('series hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { data: { search: { search: mockSearch } } },
    });
    mockIndex.mockReturnValue({ data: { indexName: '.entities-v1' }, isLoading: false });
    // The index as the index hook resolves it, and the plain filter clauses: the group overrides of the
    // filters have their own tests (use_tile_query_inputs.test.ts).
    (useTileQueryInputs as jest.Mock).mockImplementation(
      (spaceId: string, entityFilters: EntityFilters) => ({
        ...mockIndex(spaceId),
        entityFilterClauses: buildEntityFilterClauses(entityFilters),
      })
    );
    mockJobs.mockReturnValue({ jobIds: ['job_a'], loading: false });
    mockUseQuery.mockReturnValue(queryResult());
  });

  describe.each(HOOKS)('$name', (hook) => {
    it('ends each line on the live count of its own tile', () => {
      mockUseQuery.mockReturnValue(queryResult({ data: hook.toQueryData(dotsOfTiles(hook)) }));
      const { trends, isTrendLoading } = run(hook);
      trends.forEach((trend, t) => {
        expect(trend?.slice(0, -1)).toEqual(dotsOfTiles(hook)[t].slice(0, -1));
        expect(trend?.[DOT_COUNT - 1]).toBe(4 + t);
      });
      expect(isTrendLoading).toBe(false);
    });

    it('holds the query back until the counts and deltas have loaded, when skipped and while the index loads', () => {
      run(hook);
      expect(isEnabled()).toBe(true);
      run(hook, { isReady: false });
      expect(isEnabled()).toBe(false);
      run(hook, { skip: true });
      expect(isEnabled()).toBe(false);
      mockIndex.mockReturnValue({ data: undefined, isLoading: true });
      run(hook);
      expect(isEnabled()).toBe(false);
    });

    it.each([
      ['the history is too short', { count: 4, reachesBack: false }],
      ['the count is 0', { count: 0, reachesBack: true }],
    ])('leaves the lines out, with no spinner and no query, when %s', (_reason, tile) => {
      expect(runAll(hook, tile)).toEqual(NO_LINES(hook));
      expect(isEnabled()).toBe(false);
    });

    it('waits for the history check before it decides, with the spinner on', () => {
      const result = runAll(hook, { count: 4, reachesBack: undefined }, { isReady: false });
      expect(isEnabled()).toBe(false);
      expect(result.isTrendLoading).toBe(true);
    });

    it('stops the spinner when no index resolves, but not while it loads', () => {
      mockIndex.mockReturnValue({ data: undefined, isLoading: false });
      expect(run(hook).isTrendLoading).toBe(false);
      mockIndex.mockReturnValue({ data: undefined, isLoading: true });
      expect(run(hook).isTrendLoading).toBe(true);
    });

    it('shows no line and a spinner while loading, none and no spinner after an error', () => {
      mockUseQuery.mockReturnValue(queryResult({ isFetching: true }));
      expect(run(hook)).toEqual({ ...NO_LINES(hook), isTrendLoading: true });
      mockUseQuery.mockReturnValue(queryResult({ isError: true }));
      expect(run(hook)).toEqual(NO_LINES(hook));
    });

    it('sends one query and reads the dots of each tile from its own columns', async () => {
      const columns = hook.columns.flatMap((column, t) =>
        Array.from({ length: DOT_COUNT }, (_, k) => ({ name: column(k), value: 1000 * t + k }))
      );
      mockSearch.mockReturnValue(
        of({
          rawResponse: {
            columns: columns.map(({ name }) => ({ name })),
            values: [columns.map(({ value }) => value)],
          },
        })
      );
      run(hook);
      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const [key, queryFn] = lastCall();
      expect(key[0]).toBe(hook.tileKey);
      // Oldest first: the first dot is column 5 of the tile, the last is column 0.
      hook.fromParsed(await queryFn({ signal: undefined })).forEach((dots, t) => {
        expect(dots[0]).toBe(1000 * t + DOT_COUNT - 1);
        expect(dots[DOT_COUNT - 1]).toBe(1000 * t);
      });
    });

    it('applies the entity filters, as the count does', () => {
      const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
      const clauses = hook.clausesOf(entityFilters);
      expect(clauses.length).toBeGreaterThan(0);
      run(hook, { entityFilters });
      clauses.forEach((clause) => expect(lastCall()[0][1]).toContain(clause));
      run(hook);
      clauses.forEach((clause) => expect(lastCall()[0][1]).not.toContain(clause));
    });
  });

  describe.each(TWO_TILE_HOOKS)('$name: two tiles in one query', (hook) => {
    it('hides only the tile whose count is 0, and runs while the other has a count', () => {
      mockUseQuery.mockReturnValue(queryResult({ data: hook.toQueryData(dotsOfTiles(hook)) }));
      const [first, second] = settledTiles(hook);

      const firstZero = run(hook, { tiles: [{ ...first, count: 0 }, second] });
      expect(isEnabled()).toBe(true);
      expect(firstZero.trends[0]).toBeUndefined();
      expect(firstZero.trends[1]?.[DOT_COUNT - 1]).toBe(second.count);

      const secondZero = run(hook, { tiles: [first, { ...second, count: 0 }] });
      expect(isEnabled()).toBe(true);
      expect(secondZero.trends[0]?.[DOT_COUNT - 1]).toBe(first.count);
      expect(secondZero.trends[1]).toBeUndefined();
    });

    it('does not run when both counts are 0', () => {
      expect(runAll(hook, { count: 0, reachesBack: true })).toEqual(NO_LINES(hook));
      expect(isEnabled()).toBe(false);
    });
  });

  describe('risk', () => {
    it('hides only the tile whose own history is too short, and runs while the other reaches back', () => {
      mockUseQuery.mockReturnValue(queryResult({ data: RISK.toQueryData(dotsOfTiles(RISK)) }));
      const [movers, newlyHigh] = settledTiles(RISK);

      const moversShort = run(RISK, { tiles: [{ ...movers, reachesBack: false }, newlyHigh] });
      expect(isEnabled()).toBe(true);
      expect(moversShort.trends[0]).toBeUndefined();
      expect(moversShort.trends[1]).toBeDefined();

      const newlyHighShort = run(RISK, { tiles: [movers, { ...newlyHigh, reachesBack: false }] });
      expect(isEnabled()).toBe(true);
      expect(newlyHighShort.trends[0]).toBeDefined();
      expect(newlyHighShort.trends[1]).toBeUndefined();
    });
  });

  describe('anomalies', () => {
    it('runs the query with the installed jobs', () => {
      run(ANOMALIES);
      expect(lastCall()[0][1]).toContain('job_id IN ("job_a")');
    });

    it('does not run when no job is installed, with no spinner, but waits while the jobs load', () => {
      mockJobs.mockReturnValue({ jobIds: [], loading: false });
      expect(run(ANOMALIES)).toEqual(NO_LINES(ANOMALIES));
      expect(isEnabled()).toBe(false);

      mockJobs.mockReturnValue({ jobIds: [], loading: true });
      expect(run(ANOMALIES).isTrendLoading).toBe(true);
      expect(isEnabled()).toBe(false);

      mockJobs.mockReturnValue({ jobIds: ['job_a'], loading: true });
      run(ANOMALIES);
      expect(isEnabled()).toBe(false);
    });
  });

  describe('new entity', () => {
    it('runs on the local cluster only, like the count', async () => {
      mockSearch.mockReturnValue(
        of({
          rawResponse: {
            columns: Array.from({ length: DOT_COUNT }, (_, k) => ({
              name: NEW_ENTITY.columns[0](k),
            })),
            values: [Array.from({ length: DOT_COUNT }, () => 0)],
          },
        })
      );
      run(NEW_ENTITY);
      const [key, queryFn] = lastCall();
      await queryFn({ signal: undefined });
      expect(mockSearch).toHaveBeenCalledWith(
        { params: { query: key[1] } },
        expect.objectContaining({ strategy: 'esql_async', projectRouting: '_alias:_origin' })
      );
    });
  });
});
