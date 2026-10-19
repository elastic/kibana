/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useInstalledSecurityJobsIds } from '../../../../../common/components/ml/hooks/use_installed_security_jobs';
import { useResolvedLatestEntitiesIndexName } from '../../../../../common/hooks/use_resolved_latest_entities_index_name';
import { EMPTY_ENTITY_FILTERS } from '../../entities_grid/common';
import { buildEntityFilterClauses } from '../../entities_grid/queries/entity_filters';
import { getEntityFilterESQL } from '../../use_entity_filters_param';
import { useAlertBasedTilesDelta } from './use_alert_based_tiles_delta';
import { useEntitiesWithAnomaliesDelta } from './use_entities_with_anomalies_delta';
import { useNewEntityDelta } from './use_new_entity_delta';
import { useNewlyHighCriticalDelta, useRiskMoversDelta } from './use_risk_tiles_delta';
import { usePreviousPeriod } from './use_previous_period';
import { RISK_MOVER_MIN_SCORE_CHANGE } from '../queries/risk_history';

jest.mock('./use_previous_period', () => ({
  ...jest.requireActual('./use_previous_period'),
  usePreviousPeriod: jest.fn(),
}));
jest.mock('../../../../../common/components/ml/hooks/use_installed_security_jobs', () => ({
  useInstalledSecurityJobsIds: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_resolved_latest_entities_index_name', () => ({
  useResolvedLatestEntitiesIndexName: jest.fn(),
}));

const mockPreviousPeriod = usePreviousPeriod as jest.Mock;
const lastOptions = () =>
  mockPreviousPeriod.mock.calls[mockPreviousPeriod.mock.calls.length - 1][0];
const returns = (overrides = {}) =>
  mockPreviousPeriod.mockReturnValue({
    previous: undefined,
    reachesBack: undefined,
    isHistoryMissing: false,
    isError: false,
    ...overrides,
  });

const base = { spaceId: 'default', timeRange: '7d' as const, isReady: true };

beforeEach(() => {
  jest.clearAllMocks();
  (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
    data: { indexName: '.entities-v1' },
    isLoading: false,
  });
  (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: ['job_a'], loading: false });
  returns();
});

describe.each([
  [
    'useEntitiesWithAnomaliesDelta',
    (o: object) => renderHook(() => useEntitiesWithAnomaliesDelta({ ...base, count: 10, ...o })),
    'entitiesWithAnomalies',
  ],
  [
    'useNewEntityDelta',
    (o: object) => renderHook(() => useNewEntityDelta({ ...base, count: 10, ...o })),
    'newEntity',
  ],
  [
    'useRiskMoversDelta',
    (o: object) => renderHook(() => useRiskMoversDelta({ ...base, count: 10, ...o })),
    'riskMovers',
  ],
  [
    'useNewlyHighCriticalDelta',
    (o: object) => renderHook(() => useNewlyHighCriticalDelta({ ...base, count: 10, ...o })),
    'newlyHighCritical',
  ],
] as const)('%s', (_name, render, tileKey) => {
  it('is the count minus the previous period', () => {
    returns({ previous: 4, reachesBack: true });
    const { result } = render({});
    expect(result.current).toEqual({
      delta: 6,
      isDeltaLoading: false,
      isHistoryMissing: false,
      reachesBack: true,
    });
  });

  it('passes on whether the history reaches back, so the sparkline can follow the same rule', () => {
    returns({ reachesBack: true });
    expect(render({}).result.current.reachesBack).toBe(true);
    returns({ reachesBack: false, isHistoryMissing: true });
    expect(render({}).result.current.reachesBack).toBe(false);
    returns({ reachesBack: undefined });
    expect(render({}).result.current.reachesBack).toBeUndefined();
  });

  it('runs once the page is ready, the tile is not skipped and its count is above 0', () => {
    render({});
    expect(lastOptions().tileKey).toBe(tileKey);
    expect(lastOptions().enabled).toBe(true);

    render({ isReady: false });
    expect(lastOptions().enabled).toBe(false);
    render({ skip: true });
    expect(lastOptions().enabled).toBe(false);
    render({ count: 0 });
    expect(lastOptions().enabled).toBe(false);
  });

  it('waits with a spinner for the other counts, and shows none at a zero count', () => {
    expect(render({ isReady: false }).result.current.isDeltaLoading).toBe(true);
    expect(render({ count: 0 }).result.current.isDeltaLoading).toBe(false);
    expect(render({ skip: true }).result.current.isDeltaLoading).toBe(false);
  });

  it('shows a spinner while the delta loads, then none after an error', () => {
    expect(render({}).result.current.isDeltaLoading).toBe(true);
    returns({ isError: true });
    expect(render({}).result.current).toEqual({
      delta: undefined,
      isDeltaLoading: false,
      isHistoryMissing: false,
      reachesBack: undefined,
    });
  });

  it('says the history is too short, with no delta and no spinner', () => {
    returns({ isHistoryMissing: true, reachesBack: false });
    expect(render({}).result.current).toEqual({
      delta: undefined,
      isDeltaLoading: false,
      isHistoryMissing: true,
      reachesBack: false,
    });
  });

  it('shows no spinner when the entities index never resolves, but not while it loads', () => {
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    expect(render({}).result.current.isDeltaLoading).toBe(false);
    (useResolvedLatestEntitiesIndexName as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    expect(render({}).result.current.isDeltaLoading).toBe(true);
    expect(lastOptions().enabled).toBe(false);
  });

  it('builds a history check and a count-only previous-period query', () => {
    render({});
    expect(lastOptions().guardQuery).toContain('reaches_back');
    expect(lastOptions().previousQuery).not.toContain('VALUES');
    expect(lastOptions().previousQuery).toBeTruthy();
  });
});

describe('useEntitiesWithAnomaliesDelta', () => {
  const render = (o: object = {}) =>
    renderHook(() => useEntitiesWithAnomaliesDelta({ ...base, count: 10, ...o }));

  it('needs the installed jobs: it waits while they load and shows no spinner when none is installed', () => {
    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({
      jobIds: ['job_a'],
      loading: true,
    });
    expect(render().result.current.isDeltaLoading).toBe(true);
    expect(lastOptions().enabled).toBe(false);

    (useInstalledSecurityJobsIds as jest.Mock).mockReturnValue({ jobIds: [], loading: false });
    expect(render().result.current.isDeltaLoading).toBe(false);
    expect(lastOptions().enabled).toBe(false);
  });

  it('uses the installed jobs in both queries', () => {
    render();
    expect(lastOptions().guardQuery).toContain('job_id IN ("job_a")');
    expect(lastOptions().previousQuery).toContain('job_id IN ("job_a")');
  });

  it('applies the entity filters to the previous period, as the count does', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);
    render({ entityFilters });
    clauses.forEach((clause) => expect(lastOptions().previousQuery).toContain(clause));
    render();
    clauses.forEach((clause) => expect(lastOptions().previousQuery).not.toContain(clause));
  });
});

describe('useNewEntityDelta', () => {
  it('runs on the local cluster only, like the count, and applies the entity filters', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = getEntityFilterESQL(entityFilters);
    expect(clauses.length).toBeGreaterThan(0);
    renderHook(() => useNewEntityDelta({ ...base, count: 3, entityFilters }));
    expect(lastOptions().localOnly).toBe(true);
    clauses.forEach((clause) => expect(lastOptions().previousQuery).toContain(clause));
  });
});

describe('the risk tile deltas', () => {
  it('check both ends of the previous period in the risk history', () => {
    renderHook(() => useRiskMoversDelta({ ...base, count: 3 }));
    expect(lastOptions().guardQuery).toContain('risk-score');
    expect(lastOptions().guardQuery).toContain('has_end');
  });

  it('share one history check: the same key and the same query, so it goes out once', () => {
    renderHook(() => useRiskMoversDelta({ ...base, count: 3 }));
    const movers = lastOptions();
    renderHook(() => useNewlyHighCriticalDelta({ ...base, count: 3 }));
    const newlyHighCritical = lastOptions();
    expect(movers.guardKey).toBeDefined();
    expect(newlyHighCritical.guardKey).toBe(movers.guardKey);
    expect(newlyHighCritical.guardQuery).toBe(movers.guardQuery);
    expect(newlyHighCritical.tileKey).not.toBe(movers.tileKey);
  });

  it('read the previous period of their own tile', () => {
    renderHook(() => useRiskMoversDelta({ ...base, count: 3 }));
    expect(lastOptions().previousQuery).toContain(
      `current_score - boundary_score >= ${RISK_MOVER_MIN_SCORE_CHANGE}`
    );
    renderHook(() => useNewlyHighCriticalDelta({ ...base, count: 3 }));
    expect(lastOptions().previousQuery).toContain('current_level_num >= 3');
  });
});

describe('useAlertBasedTilesDelta', () => {
  const render = (o: object = {}) =>
    renderHook(() =>
      useAlertBasedTilesDelta({ ...base, severeAlertsCount: 10, watchlistedCount: 4, ...o })
    );

  it('gives each tile its own delta from the one shared previous-period query', () => {
    returns({ previous: { severeAlertsCount: 7, watchlistedCount: 6 }, reachesBack: true });
    expect(render().result.current).toEqual({
      severeAlertsDelta: 3,
      watchlistedDelta: -2,
      isDeltaLoading: false,
      isHistoryMissing: false,
      reachesBack: true,
    });
  });

  it('skips the shared query only when BOTH counts are 0', () => {
    render({ severeAlertsCount: 0, watchlistedCount: 4 });
    expect(lastOptions().enabled).toBe(true);
    render({ severeAlertsCount: 5, watchlistedCount: 0 });
    expect(lastOptions().enabled).toBe(true);

    render({ severeAlertsCount: 0, watchlistedCount: 0 });
    expect(lastOptions().enabled).toBe(false);
    expect(
      render({ severeAlertsCount: 0, watchlistedCount: 0 }).result.current.isDeltaLoading
    ).toBe(false);
  });

  it('waits for the other counts and for the entities index, and respects skip', () => {
    render({ isReady: false });
    expect(lastOptions().enabled).toBe(false);
    expect(render({ isReady: false }).result.current.isDeltaLoading).toBe(true);
    render({ skip: true });
    expect(lastOptions().enabled).toBe(false);
  });

  it('shows the history message and no spinner when the alerts do not reach back far enough', () => {
    returns({ isHistoryMissing: true });
    const { result } = render();
    expect(result.current.isHistoryMissing).toBe(true);
    expect(result.current.isDeltaLoading).toBe(false);
  });

  it('builds the alerts history check and a count-only previous-period query with the filters', () => {
    const entityFilters = { ...EMPTY_ENTITY_FILTERS, assetCriticality: ['high_impact'] };
    const clauses = buildEntityFilterClauses(entityFilters);
    render({ entityFilters });
    expect(lastOptions().guardQuery).toContain('FROM .alerts-security.alerts-default');
    expect(lastOptions().previousQuery).not.toContain('VALUES');
    clauses.forEach((clause) => expect(lastOptions().previousQuery).toContain(clause));
  });
});
