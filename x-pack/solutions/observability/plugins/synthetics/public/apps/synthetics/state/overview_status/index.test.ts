/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  OverviewStalePriorRun,
  OverviewStatus,
  OverviewStatusMetaData,
  PaginatedOverviewStatus,
} from '../../../../../common/runtime_types';
import { overviewStatusReducer } from '.';
import {
  appendOverviewStatusAction,
  clearOverviewStatusErrorAction,
  fetchOverviewStatusAction,
  fetchStaleStatusAction,
  quietFetchOverviewStatusAction,
} from './actions';

const makeMeta = (
  overrides: Partial<OverviewStatusMetaData> & { configId: string }
): OverviewStatusMetaData =>
  ({
    monitorQueryId: overrides.configId,
    name: overrides.configId,
    schedule: '3',
    tags: [],
    isEnabled: true,
    type: 'http',
    isStatusAlertEnabled: false,
    overallStatus: 'pending',
    locations: [{ id: 'us_east', label: 'US East', status: 'pending' }],
    ...overrides,
  } as OverviewStatusMetaData);

const makeStatus = (overrides: Partial<OverviewStatus> = {}): OverviewStatus =>
  ({
    allMonitorsCount: 0,
    disabledMonitorsCount: 0,
    projectMonitorsCount: 0,
    up: 0,
    down: 0,
    pending: 0,
    stale: 0,
    disabledCount: 0,
    enabledMonitorQueryIds: [],
    disabledMonitorQueryIds: [],
    allIds: [],
    upConfigs: {},
    downConfigs: {},
    pendingConfigs: {},
    staleConfigs: {},
    disabledConfigs: {},
    ...overrides,
  } as OverviewStatus);

const makePaginated = (
  configs: OverviewStatusMetaData[],
  overrides: Partial<PaginatedOverviewStatus> = {}
): PaginatedOverviewStatus =>
  ({
    ...makeStatus(),
    configs,
    total: configs.length,
    ...overrides,
  } as unknown as PaginatedOverviewStatus);

// `isRunStale` uses a 15-minute floor, so a run hours old is reliably stale and
// a run minutes old is reliably fresh — no need to freeze the clock.
const stalePriorRun = (
  overrides: Partial<OverviewStalePriorRun> & { monitorQueryId: string }
): OverviewStalePriorRun => ({
  locationId: 'us_east',
  timestamp: moment().subtract(3, 'hours').toISOString(),
  status: 'up',
  ...overrides,
});

const freshPriorRun = (
  overrides: Partial<OverviewStalePriorRun> & { monitorQueryId: string }
): OverviewStalePriorRun => ({
  locationId: 'us_east',
  timestamp: moment().subtract(2, 'minutes').toISOString(),
  status: 'up',
  ...overrides,
});

describe('overviewStatusReducer', () => {
  describe('settled flag (drives the Getting Started redirect)', () => {
    it('is false before any request completes', () => {
      const state = overviewStatusReducer(undefined, { type: '@@INIT' } as any);
      expect(state.settled).toBe(false);
    });

    it('is set on a successful load', () => {
      const state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(makeStatus())
      );
      expect(state.settled).toBe(true);
    });

    it('is set on a failed load (even though `loaded` stays false)', () => {
      const state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.fail(new Error('overview status request failed') as any)
      );
      expect(state.settled).toBe(true);
      expect(state.loaded).toBe(false);
    });

    it('stays true after the transient error is cleared', () => {
      const failed = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.fail(new Error('boom') as any)
      );
      const cleared = overviewStatusReducer(failed, clearOverviewStatusErrorAction());
      // The OverviewStatus toast effect clears `error`, but `settled` must persist
      // so the empty-state redirect still fires.
      expect(cleared.error).toBeNull();
      expect(cleared.settled).toBe(true);
    });
  });

  describe('fetchStaleStatusAction.success (pending -> stale promotion)', () => {
    const loadedState = () =>
      overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makeStatus({
            pendingConfigs: {
              mon1: makeMeta({ configId: 'mon1' }),
              mon2: makeMeta({ configId: 'mon2' }),
            },
          })
        )
      );

    it('promotes a monitor whose prior run is old enough to be stale', () => {
      const initial = loadedState();
      expect(initial.allConfigs).toHaveLength(2);

      const next = overviewStatusReducer(
        initial,
        fetchStaleStatusAction.success({ priorRuns: [stalePriorRun({ monitorQueryId: 'mon1' })] })
      );

      expect(next.status?.pendingConfigs.mon1).toBeUndefined();
      const promoted = next.status?.staleConfigs.mon1;
      expect(promoted?.overallStatus).toBe('stale');
      expect(promoted?.locations[0].status).toBe('stale');
      // carries the last-known status so the "show last run" view can render it
      expect(promoted?.locations[0].lastStatus).toBe('up');
      // monitors with no prior run stay pending
      expect(next.status?.pendingConfigs.mon2).toBeDefined();
    });

    it('keeps a monitor pending when its prior run is still fresh', () => {
      const initial = loadedState();

      const next = overviewStatusReducer(
        initial,
        fetchStaleStatusAction.success({ priorRuns: [freshPriorRun({ monitorQueryId: 'mon1' })] })
      );

      expect(next.status?.pendingConfigs.mon1).toBeDefined();
      expect(next.status?.staleConfigs.mon1).toBeUndefined();
    });

    it('rebuilds allConfigs so consumers see the promoted (stale) metadata', () => {
      const initial = loadedState();

      const next = overviewStatusReducer(
        initial,
        fetchStaleStatusAction.success({
          priorRuns: [stalePriorRun({ monitorQueryId: 'mon1', status: 'down' })],
        })
      );

      const promoted = next.allConfigs?.find((config) => config.configId === 'mon1');
      expect(promoted?.overallStatus).toBe('stale');
      expect(promoted?.locations[0].lastStatus).toBe('down');
      expect(next.allConfigs).toHaveLength(2);
    });

    it('is a no-op when no prior runs are returned', () => {
      const initial = loadedState();
      const next = overviewStatusReducer(
        initial,
        fetchStaleStatusAction.success({ priorRuns: [] })
      );

      expect(next.status?.pendingConfigs.mon1).toBeDefined();
      expect(next.status?.pendingConfigs.mon2).toBeDefined();
      expect(next.status?.staleConfigs).toEqual({});
    });

    it('is a no-op when the overview status has not loaded yet', () => {
      const next = overviewStatusReducer(
        undefined,
        fetchStaleStatusAction.success({ priorRuns: [stalePriorRun({ monitorQueryId: 'mon1' })] })
      );

      expect(next.status).toBeNull();
    });
  });

  describe('re-applying the promotion across a background refresh', () => {
    const promotedState = () => {
      const loaded = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makeStatus({ pendingConfigs: { mon1: makeMeta({ configId: 'mon1' }) } })
        )
      );
      return overviewStatusReducer(
        loaded,
        fetchStaleStatusAction.success({ priorRuns: [stalePriorRun({ monitorQueryId: 'mon1' })] })
      );
    };

    it('keeps the monitor stale on the next overview load without re-fetching (no flicker)', () => {
      const promoted = promotedState();
      expect(promoted.status?.staleConfigs.mon1).toBeDefined();

      // A background refresh replaces `status` wholesale — mon1 comes back as
      // pending in the raw payload, but the stored prior-run facts re-promote it
      // within the same reducer pass.
      const refreshed = overviewStatusReducer(
        promoted,
        fetchOverviewStatusAction.success(
          makeStatus({ pendingConfigs: { mon1: makeMeta({ configId: 'mon1' }) } })
        )
      );

      expect(refreshed.status?.pendingConfigs.mon1).toBeUndefined();
      expect(refreshed.status?.staleConfigs.mon1?.overallStatus).toBe('stale');
    });

    it('does not re-promote a monitor that started reporting again', () => {
      const promoted = promotedState();

      // mon1 now has in-window data again → arrives as `up`, not pending.
      const refreshed = overviewStatusReducer(
        promoted,
        fetchOverviewStatusAction.success(
          makeStatus({
            upConfigs: {
              mon1: makeMeta({
                configId: 'mon1',
                overallStatus: 'up',
                locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
              }),
            },
          })
        )
      );

      expect(refreshed.status?.upConfigs.mon1?.overallStatus).toBe('up');
      expect(refreshed.status?.staleConfigs.mon1).toBeUndefined();
      expect(refreshed.status?.pendingConfigs.mon1).toBeUndefined();
    });
  });

  describe('appendOverviewStatusAction (card view infinite scroll)', () => {
    it('merges the appended page into allConfigs and keeps the server-global total', () => {
      const initial = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon1' }), makeMeta({ configId: 'mon2' })], {
            pendingConfigs: {
              mon1: makeMeta({ configId: 'mon1' }),
              mon2: makeMeta({ configId: 'mon2' }),
            },
            pending: 4,
            total: 4,
          })
        )
      );
      expect(initial.allConfigs).toHaveLength(2);
      expect(initial.total).toBe(4);

      const merged = overviewStatusReducer(
        initial,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon3' }), makeMeta({ configId: 'mon4' })], {
            pendingConfigs: {
              mon3: makeMeta({ configId: 'mon3' }),
              mon4: makeMeta({ configId: 'mon4' }),
            },
            pending: 4,
            total: 4,
          })
        )
      );

      // page order preserved, no collapse back to page 1
      expect(merged.allConfigs?.map((config) => config.configId)).toEqual([
        'mon1',
        'mon2',
        'mon3',
        'mon4',
      ]);
      expect(merged.status?.configs).toHaveLength(4);
      // buckets merged so per-config lookups keep resolving across pages
      expect(Object.keys(merged.status?.pendingConfigs ?? {}).sort()).toEqual([
        'mon1',
        'mon2',
        'mon3',
        'mon4',
      ]);
      // total is the server-global count, not the accumulated length
      expect(merged.total).toBe(4);
    });

    it('dedupes by configId, updating the existing entry in place', () => {
      const initial = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated([
            makeMeta({ configId: 'mon1' }),
            makeMeta({ configId: 'mon2', name: 'old-name' }),
          ])
        )
      );

      const merged = overviewStatusReducer(
        initial,
        appendOverviewStatusAction.success(
          makePaginated([
            makeMeta({ configId: 'mon2', name: 'new-name' }),
            makeMeta({ configId: 'mon3' }),
          ])
        )
      );

      expect(merged.allConfigs?.map((config) => config.configId)).toEqual(['mon1', 'mon2', 'mon3']);
      expect(merged.allConfigs?.find((config) => config.configId === 'mon2')?.name).toBe(
        'new-name'
      );
    });

    it('keeps CCS rows that share configId when appending pages', () => {
      const east = makeMeta({
        configId: 'shared',
        name: 'east',
        remote: { remoteName: 'cluster-east' },
        locations: [{ id: 'us-east-1', label: 'us-east-1', status: 'up' }],
        overallStatus: 'up',
      });
      const west = makeMeta({
        configId: 'shared',
        name: 'west',
        remote: { remoteName: 'cluster-west' },
        locations: [{ id: 'us-east-1', label: 'us-east-1', status: 'up' }],
        overallStatus: 'up',
      });

      const initial = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated([east], {
            upConfigs: { 'cluster-east-shared-us-east-1': east },
            total: 2,
          })
        )
      );
      const merged = overviewStatusReducer(
        initial,
        appendOverviewStatusAction.success(
          makePaginated([west], {
            upConfigs: { 'cluster-west-shared-us-east-1': west },
            total: 2,
          })
        )
      );

      expect(merged.allConfigs).toHaveLength(2);
      expect(merged.allConfigs?.map((config) => config.name).sort()).toEqual(['east', 'west']);
      expect(Object.keys(merged.status?.upConfigs ?? {}).sort()).toEqual([
        'cluster-east-shared-us-east-1',
        'cluster-west-shared-us-east-1',
      ]);
    });

    it('replaces when there is no paginated base to merge into', () => {
      const merged = overviewStatusReducer(
        undefined,
        appendOverviewStatusAction.success(makePaginated([makeMeta({ configId: 'mon1' })]))
      );

      expect(merged.allConfigs?.map((config) => config.configId)).toEqual(['mon1']);
      expect(merged.loaded).toBe(true);
    });

    it('moves a config out of its previous status bucket when a merged page updates it', () => {
      const down = makeMeta({
        configId: 'mon1',
        overallStatus: 'down',
        locations: [{ id: 'us_east', label: 'US East', status: 'down' }],
      });
      const up = makeMeta({
        configId: 'mon1',
        overallStatus: 'up',
        locations: [{ id: 'us_east', label: 'US East', status: 'up' }],
      });

      const initial = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated([down], {
            downConfigs: { mon1: down },
            total: 2,
          })
        )
      );
      expect(initial.status?.downConfigs.mon1).toBeDefined();

      const merged = overviewStatusReducer(
        initial,
        appendOverviewStatusAction.success(
          makePaginated([up], {
            upConfigs: { mon1: up },
            total: 2,
          })
        )
      );

      expect(merged.status?.upConfigs.mon1?.overallStatus).toBe('up');
      expect(merged.status?.downConfigs.mon1).toBeUndefined();
    });

    it('drops an appended page whose filter no longer matches lastRequest', () => {
      const pageState = { page: 1, perPage: 20 } as any;
      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.get({ pageState, statusFilter: 'up' })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'up1' })], { total: 4 })
        )
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.get({ pageState, statusFilter: 'up' })
      );
      // Filter change replaces the fetch context before the in-flight append lands.
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.get({ pageState, statusFilter: 'down' })
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'up2' })], { total: 4 })
        )
      );

      expect(state.status).toBeNull();
      expect(state.allConfigs?.map((config) => config.configId)).toEqual(['up1']);
    });

    it('does not merge a late append from the old filter into already-loaded new results', () => {
      const pageState = { page: 1, perPage: 20 } as any;
      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.get({ pageState, statusFilter: 'up' })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'up1' }), makeMeta({ configId: 'up2' })], {
            total: 4,
          })
        )
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.get({ pageState, statusFilter: 'up' })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.get({ pageState, statusFilter: 'down' })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'down1' })], { total: 1 })
        )
      );

      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'up3' }), makeMeta({ configId: 'up4' })], {
            total: 4,
          })
        )
      );

      expect(state.allConfigs?.map((config) => config.configId)).toEqual(['down1']);
    });

    it('drops an appended page whose query no longer matches lastRequest', () => {
      const pageState = { page: 1, perPage: 20, query: 'alpha' } as any;
      let state = overviewStatusReducer(undefined, fetchOverviewStatusAction.get({ pageState }));
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'alpha1' })], { total: 4 })
        )
      );
      state = overviewStatusReducer(state, appendOverviewStatusAction.get({ pageState }));
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.get({ pageState: { ...pageState, query: 'beta' } })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'beta1' })], { total: 1 })
        )
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'alpha2' })], { total: 4 })
        )
      );

      expect(state.allConfigs?.map((config) => config.configId)).toEqual(['beta1']);
    });
  });

  describe('quietFetchOverviewStatusAction', () => {
    const pageState = { page: 1, perPage: 20 } as any;

    it('does not set loading on a silent timer refresh', () => {
      const loaded = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(makePaginated([makeMeta({ configId: 'mon1' })]))
      );
      expect(loaded.loading).toBe(false);

      const refreshed = overviewStatusReducer(
        loaded,
        quietFetchOverviewStatusAction.get({ pageState, silent: true })
      );

      expect(refreshed.loading).toBe(false);
    });

    it('sets loading on a non-silent (navigation) quiet fetch', () => {
      const loaded = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(makePaginated([makeMeta({ configId: 'mon1' })]))
      );

      const navigating = overviewStatusReducer(
        loaded,
        quietFetchOverviewStatusAction.get({ pageState })
      );

      expect(navigating.loading).toBe(true);
    });
  });

  describe('fetchOverviewStatusAction.success (accumulated card-view window)', () => {
    const pageState = { page: 1, perPage: 2 } as any;

    it('does not shrink allConfigs when a shorter silent refresh has the same total', () => {
      const page1 = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon1' }), makeMeta({ configId: 'mon2' })], {
            page: 1,
            total: 4,
          })
        )
      );
      const accumulated = overviewStatusReducer(
        page1,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon3' }), makeMeta({ configId: 'mon4' })], {
            page: 2,
            total: 4,
          })
        )
      );
      expect(accumulated.allConfigs).toHaveLength(4);

      // Timer refresh of page 1 (2 items) while 4 are already loaded.
      let state = overviewStatusReducer(
        accumulated,
        quietFetchOverviewStatusAction.get({ pageState, silent: true })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated(
            [makeMeta({ configId: 'mon1', name: 'updated' }), makeMeta({ configId: 'mon2' })],
            { page: 1, total: 4 }
          )
        )
      );

      expect(state.allConfigs?.map((config) => config.configId)).toEqual([
        'mon1',
        'mon2',
        'mon3',
        'mon4',
      ]);
      expect(state.allConfigs?.find((config) => config.configId === 'mon1')?.name).toBe('updated');
    });

    it('keeps appended pages when a silent page-1 refresh completes after the append', () => {
      let state = overviewStatusReducer(undefined, fetchOverviewStatusAction.get({ pageState }));
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon1' }), makeMeta({ configId: 'mon2' })], {
            page: 1,
            total: 4,
          })
        )
      );
      state = overviewStatusReducer(
        state,
        quietFetchOverviewStatusAction.get({ pageState, silent: true })
      );
      state = overviewStatusReducer(state, appendOverviewStatusAction.get({ pageState }));
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon3' }), makeMeta({ configId: 'mon4' })], {
            page: 2,
            total: 4,
          })
        )
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon1' }), makeMeta({ configId: 'mon2' })], {
            page: 1,
            total: 4,
          })
        )
      );

      expect(state.allConfigs?.map((config) => config.configId)).toEqual([
        'mon1',
        'mon2',
        'mon3',
        'mon4',
      ]);
    });

    it('replaces when navigating to a shorter compact-table page', () => {
      const page4Configs = Array.from({ length: 20 }, (_, i) => makeMeta({ configId: `p4-${i}` }));
      const page5Configs = Array.from({ length: 5 }, (_, i) => makeMeta({ configId: `p5-${i}` }));

      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated(page4Configs, { page: 4, perPage: 20, total: 85 })
        )
      );
      state = overviewStatusReducer(
        state,
        quietFetchOverviewStatusAction.get({
          pageState: { page: 5, perPage: 20 } as any,
        })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated(page5Configs, { page: 5, perPage: 20, total: 85 })
        )
      );

      expect(state.allConfigs?.map((config) => config.configId)).toEqual(
        page5Configs.map((config) => config.configId)
      );
      expect(state.allConfigs).toHaveLength(5);
    });

    it('replaces when reducing compact-table perPage', () => {
      const largePage = Array.from({ length: 50 }, (_, i) => makeMeta({ configId: `p1-${i}` }));
      const smallPage = Array.from({ length: 20 }, (_, i) => makeMeta({ configId: `p1-${i}` }));

      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated(largePage, { page: 1, perPage: 50, total: 85 })
        )
      );
      state = overviewStatusReducer(
        state,
        quietFetchOverviewStatusAction.get({
          pageState: { page: 1, perPage: 20 } as any,
        })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated(smallPage, { page: 1, perPage: 20, total: 85 })
        )
      );

      expect(state.allConfigs).toHaveLength(20);
    });

    it('stores refreshThrough on a clamped silent refresh and clears it once covered', () => {
      const page1 = [
        makeMeta({ configId: 'mon1' }),
        makeMeta({ configId: 'mon2' }),
        makeMeta({ configId: 'mon3' }),
        makeMeta({ configId: 'mon4' }),
      ];
      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(makePaginated(page1, { page: 1, perPage: 4, total: 4 }))
      );
      state = overviewStatusReducer(
        state,
        quietFetchOverviewStatusAction.get({
          pageState: { page: 1, perPage: 2 } as any,
          silent: true,
          refreshThrough: 4,
        })
      );
      expect(state.refreshThrough).toBe(4);

      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon1' }), makeMeta({ configId: 'mon2' })], {
            page: 1,
            perPage: 2,
            total: 4,
          })
        )
      );
      expect(state.refreshThrough).toBe(4);
      expect(state.allConfigs).toHaveLength(4);

      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.get({
          pageState: { page: 2, perPage: 2 } as any,
          silent: true,
        })
      );
      expect(state.loading).toBe(false);

      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated(
            [
              makeMeta({ configId: 'mon3', name: 'updated' }),
              makeMeta({ configId: 'mon4' }),
              makeMeta({ configId: 'mon5' }),
            ],
            { page: 2, perPage: 2, total: 4 }
          )
        )
      );

      expect(state.refreshThrough).toBeUndefined();
      expect(state.allConfigs?.map((config) => config.configId)).toEqual([
        'mon1',
        'mon2',
        'mon3',
        'mon4',
      ]);
      expect(state.allConfigs?.find((config) => config.configId === 'mon3')?.name).toBe('updated');
    });

    it('cancels a window remainder when the user appends the next infinite-scroll page', () => {
      let state = overviewStatusReducer(
        undefined,
        quietFetchOverviewStatusAction.get({
          pageState: { page: 1, perPage: 2 } as any,
          silent: true,
          refreshThrough: 4,
        })
      );
      expect(state.refreshThrough).toBe(4);

      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.get({ pageState: { page: 3, perPage: 20 } as any })
      );
      expect(state.refreshThrough).toBeUndefined();
      expect(state.loading).toBe(true);
    });

    it('fills remaining grouped pages without clipping newly loaded keys', () => {
      const page1 = [makeMeta({ configId: 'mon1' }), makeMeta({ configId: 'mon2' })];
      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.get({
          pageState: { page: 1, perPage: 2 } as any,
          fillAll: true,
        })
      );
      expect(state.fillAllInFlight).toBe(true);

      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(makePaginated(page1, { page: 1, perPage: 2, total: 3 }))
      );
      expect(state.fillThrough).toBe(3);
      expect(state.fillAllInFlight).toBe(false);

      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.get({
          pageState: { page: 2, perPage: 2 } as any,
          silent: true,
          fillAll: true,
        })
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon3' })], { page: 2, perPage: 2, total: 3 })
        )
      );

      expect(state.fillThrough).toBeUndefined();
      expect(state.allConfigs?.map((config) => config.configId)).toEqual(['mon1', 'mon2', 'mon3']);
    });

    it('drops a late grouped fill page after grouping is cancelled', () => {
      let state = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'mon1' })], { page: 1, perPage: 1, total: 3 })
        )
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.get({
          pageState: { page: 2, perPage: 1 } as any,
          silent: true,
          fillAll: true,
        })
      );
      state = overviewStatusReducer(
        state,
        quietFetchOverviewStatusAction.get({
          pageState: { page: 1, perPage: 20 } as any,
        })
      );
      state = overviewStatusReducer(
        state,
        fetchOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'only-page' })], { page: 1, perPage: 20, total: 3 })
        )
      );
      state = overviewStatusReducer(
        state,
        appendOverviewStatusAction.success(
          makePaginated([makeMeta({ configId: 'late-fill' })], { page: 2, perPage: 1, total: 3 })
        )
      );

      expect(state.allConfigs?.map((config) => config.configId)).toEqual(['only-page']);
    });
  });

  describe('multi-location promotion', () => {
    it('promotes only the locations whose prior run is stale and orders them first', () => {
      const loaded = overviewStatusReducer(
        undefined,
        fetchOverviewStatusAction.success(
          makeStatus({
            pendingConfigs: {
              mon1: makeMeta({
                configId: 'mon1',
                locations: [
                  { id: 'us_east', label: 'US East', status: 'pending' },
                  { id: 'eu_west', label: 'EU West', status: 'pending' },
                ],
              }),
            },
          })
        )
      );

      const next = overviewStatusReducer(
        loaded,
        fetchStaleStatusAction.success({
          priorRuns: [stalePriorRun({ monitorQueryId: 'mon1', locationId: 'us_east' })],
          // eu_west has no prior run → stays pending
        })
      );

      const promoted = next.status?.staleConfigs.mon1;
      expect(promoted?.overallStatus).toBe('stale');
      const us = promoted?.locations.find((loc) => loc.id === 'us_east');
      const eu = promoted?.locations.find((loc) => loc.id === 'eu_west');
      expect(us?.status).toBe('stale');
      expect(eu?.status).toBe('pending');
      // stale locations are ordered before still-pending ones
      expect(promoted?.locations[0].id).toBe('us_east');
      expect(promoted?.locations[promoted.locations.length - 1].id).toBe('eu_west');
    });
  });
});
