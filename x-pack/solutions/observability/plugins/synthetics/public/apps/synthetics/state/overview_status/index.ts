/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createReducer } from 'redux-toolkit-v1';

import type {
  OverviewStalePriorRun,
  OverviewStatusMetaData,
  OverviewStatusState,
  PaginatedOverviewStatus,
} from '../../../../../common/runtime_types';
import { MONITOR_STATUS_ENUM } from '../../../../../common/constants/monitor_management';
import { getOverviewConfigKey, isRunStale } from '../../../../../common/lib';
import type { IHttpSerializedFetchError } from '..';
import {
  appendOverviewStatusAction,
  clearOverviewStatusErrorAction,
  fetchOverviewStatusAction,
  fetchStaleStatusAction,
  quietFetchOverviewStatusAction,
  initialLoadReported,
} from './actions';
import { getNextWindowRefreshPage, restrictOverviewPageToExistingKeys } from './window_refresh';
import type { MonitorOverviewPageState } from '../overview/models';

export interface OverviewStatusRequestContext {
  scopeStatusByLocation?: boolean;
  statusFilter?: string;
  query?: string;
  sortField?: MonitorOverviewPageState['sortField'];
  sortOrder?: MonitorOverviewPageState['sortOrder'];
  tags?: string[];
  locations?: string[];
  monitorTypes?: string[];
  projects?: string[];
  schedules?: string[];
  remoteNames?: string[];
  monitorQueryIds?: string[];
  showFromAllSpaces?: boolean;
  includeHeartbeatMonitors?: boolean;
  useLogicalAndFor?: MonitorOverviewPageState['useLogicalAndFor'];
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

const emptyToUndefined = <T>(value: T | undefined): T | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string' && value.length === 0) {
    return undefined;
  }
  if (Array.isArray(value) && value.length === 0) {
    return undefined;
  }
  return value;
};

const toRequestContext = (payload: {
  pageState: MonitorOverviewPageState;
  scopeStatusByLocation?: boolean;
  statusFilter?: string;
}): OverviewStatusRequestContext => {
  const { pageState } = payload;
  return {
    scopeStatusByLocation: payload.scopeStatusByLocation,
    statusFilter: emptyToUndefined(payload.statusFilter),
    query: emptyToUndefined(pageState.query),
    sortField: pageState.sortField,
    sortOrder: pageState.sortOrder,
    tags: emptyToUndefined(pageState.tags),
    locations: emptyToUndefined(pageState.locations),
    monitorTypes: emptyToUndefined(pageState.monitorTypes),
    projects: emptyToUndefined(pageState.projects),
    schedules: emptyToUndefined(pageState.schedules),
    remoteNames: emptyToUndefined(pageState.remoteNames),
    monitorQueryIds: emptyToUndefined(pageState.monitorQueryIds),
    showFromAllSpaces: pageState.showFromAllSpaces,
    includeHeartbeatMonitors: pageState.includeHeartbeatMonitors,
    useLogicalAndFor: emptyToUndefined(pageState.useLogicalAndFor),
    dateRangeStart: pageState.dateRangeStart,
    dateRangeEnd: pageState.dateRangeEnd,
  };
};

export interface OverviewStatusStateReducer {
  loading: boolean;
  loaded: boolean;
  status: PaginatedOverviewStatus | null;
  allConfigs?: OverviewStatusMetaData[];
  disabledConfigs?: OverviewStatusMetaData[];
  // Raw "latest run before the window" facts from the supplementary stale lookup,
  // kept so the promotion can be re-applied on every overview load. A background
  // refresh replaces `status` wholesale (momentarily moving these monitors back
  // to `pending`); re-applying here within the same reducer keeps them `stale`
  // instead of flickering grey→amber until the lookup re-resolves.
  staleBeforeWindowRuns?: OverviewStalePriorRun[];
  error: IHttpSerializedFetchError | null;
  // True once the overview status request has completed at least once, whether it
  // succeeded or failed. Unlike `loaded` (success-only) and `error` (transient —
  // cleared by the OverviewStatus toast effect), this stays true across refreshes,
  // so consumers can tell "we have a definitive answer" apart from "still pending".
  // Needed by the Getting Started redirect: a truly empty deployment whose status
  // request fails must still be recognized as settled instead of hanging on an
  // empty overview.
  settled: boolean;
  isInitialLoad: boolean;
  total?: number;
  // Result-set identity the current status was fetched with, so the card view's
  // infinite scroll can request the next page with the exact same parameters
  // and a late append from a previous query/sort/filter is dropped.
  lastRequest?: OverviewStatusRequestContext;
  // Result-set identity of an in-flight append. Compared on success so a page
  // requested under a previous query/sort/filter is not merged into a newer result.
  pendingAppendRequest?: OverviewStatusRequestContext;
  // Set while a silent (timer) replace is in flight. A late page-1 response
  // must merge into the card view's accumulated window instead of shrinking it;
  // table paging is non-silent and must always replace.
  silentReplaceInFlight?: boolean;
  // Target loaded-window size for a clamped card-view refresh. Set while
  // remainder pages are still in flight so the timer and infinite scroll wait.
  refreshThrough?: number;
  // Target size for a grouped full-set fill (`incoming.total`). Remainder
  // pages are appended (not clipped) until this is covered.
  fillThrough?: number;
  fillAllInFlight?: boolean;
  pendingFillAppend?: boolean;
}

const initialState: OverviewStatusStateReducer = {
  loading: false,
  loaded: false,
  status: null,
  error: null,
  settled: false,
  isInitialLoad: true,
};

const buildAllConfigs = (status: OverviewStatusState): OverviewStatusMetaData[] =>
  Object.values({
    ...status.upConfigs,
    ...status.downConfigs,
    ...status.pendingConfigs,
    ...status.staleConfigs,
    ...status.disabledConfigs,
  });

/**
 * Promote `pending` monitors whose last-known run happened *before* the overview
 * window and is old enough to be stale. Sources the prior-run facts resolved by
 * the supplementary lookup ({@link OverviewStatusStateReducer.staleBeforeWindowRuns})
 * and rebuilds the metadata from the monitor's current `pending` config, so the
 * promotion can be re-applied verbatim after a background refresh without a
 * second round-trip. Only monitors still classified `pending` are touched — ones
 * that started reporting again keep their fresh up/down status.
 */
const applyStaleBeforeWindow = (state: OverviewStatusStateReducer) => {
  const { status, staleBeforeWindowRuns } = state;
  if (!status || !staleBeforeWindowRuns?.length) {
    return;
  }

  const runsByMonitor = new Map<string, Map<string, OverviewStalePriorRun>>();
  for (const run of staleBeforeWindowRuns) {
    let byLocation = runsByMonitor.get(run.monitorQueryId);
    if (!byLocation) {
      byLocation = new Map();
      runsByMonitor.set(run.monitorQueryId, byLocation);
    }
    byLocation.set(run.locationId, run);
  }

  let changed = false;
  // `Object.entries` snapshots the keys, so deleting promoted entries from
  // `pendingConfigs` during the loop is safe.
  for (const [configId, meta] of Object.entries(status.pendingConfigs)) {
    const byLocation = runsByMonitor.get(meta.monitorQueryId);
    if (!byLocation) {
      continue;
    }

    const scheduleMinutes = Number(meta.schedule) || 0;
    let hasStale = false;
    let latestTimestamp: string | undefined;

    const locations = meta.locations.map((location) => {
      const run = byLocation.get(location.id);
      if (run && isRunStale(run.timestamp, scheduleMinutes)) {
        hasStale = true;
        if (!latestTimestamp || Date.parse(run.timestamp) > Date.parse(latestTimestamp)) {
          latestTimestamp = run.timestamp;
        }
        return { ...location, status: MONITOR_STATUS_ENUM.STALE, lastStatus: run.status };
      }
      return { ...location, status: MONITOR_STATUS_ENUM.PENDING };
    });

    if (!hasStale) {
      continue;
    }

    // Stale (stopped-reporting) locations first, any still-pending ones last.
    locations.sort((a, b) => {
      if (a.status === b.status) {
        return 0;
      }
      return a.status === MONITOR_STATUS_ENUM.PENDING ? 1 : -1;
    });

    status.staleConfigs[configId] = {
      ...meta,
      overallStatus: MONITOR_STATUS_ENUM.STALE,
      timestamp: latestTimestamp,
      locations,
    };
    delete status.pendingConfigs[configId];
    changed = true;
  }

  if (changed) {
    const rebuilt = buildAllConfigs(status);
    if (status.configs) {
      const byKey = new Map(rebuilt.map((config) => [getOverviewConfigKey(config), config]));
      status.configs = status.configs.map(
        (config) => byKey.get(getOverviewConfigKey(config)) ?? config
      );
      state.allConfigs = status.configs;
    } else {
      state.allConfigs = rebuilt;
    }
  }
};

const requestContextEquals = (a?: OverviewStatusRequestContext, b?: OverviewStatusRequestContext) =>
  JSON.stringify(a) === JSON.stringify(b);

const CONFIG_BUCKETS = [
  'upConfigs',
  'downConfigs',
  'pendingConfigs',
  'staleConfigs',
  'disabledConfigs',
] as const;

const collectConfigKeys = (status: PaginatedOverviewStatus): Set<string> => {
  const keys = new Set<string>();
  for (const config of status.configs ?? []) {
    keys.add(getOverviewConfigKey(config));
  }
  for (const bucket of CONFIG_BUCKETS) {
    for (const config of Object.values(status[bucket] ?? {})) {
      keys.add(getOverviewConfigKey(config));
    }
  }
  return keys;
};

const mergeBucketRecords = (
  existing: Record<string, OverviewStatusMetaData> | undefined,
  incoming: Record<string, OverviewStatusMetaData> | undefined,
  incomingKeys: Set<string>
): Record<string, OverviewStatusMetaData> => {
  const merged: Record<string, OverviewStatusMetaData> = {};
  for (const config of Object.values(existing ?? {})) {
    const key = getOverviewConfigKey(config);
    if (!incomingKeys.has(key)) {
      merged[key] = config;
    }
  }
  for (const config of Object.values(incoming ?? {})) {
    merged[getOverviewConfigKey(config)] = config;
  }
  return merged;
};

const mergePaginatedStatus = (
  existing: PaginatedOverviewStatus,
  incoming: PaginatedOverviewStatus
): PaginatedOverviewStatus => {
  const byKey = new Map(existing.configs!.map((config) => [getOverviewConfigKey(config), config]));
  for (const config of incoming.configs!) {
    byKey.set(getOverviewConfigKey(config), config);
  }
  const incomingKeys = collectConfigKeys(incoming);
  return {
    ...incoming,
    upConfigs: mergeBucketRecords(existing.upConfigs, incoming.upConfigs, incomingKeys),
    downConfigs: mergeBucketRecords(existing.downConfigs, incoming.downConfigs, incomingKeys),
    pendingConfigs: mergeBucketRecords(
      existing.pendingConfigs,
      incoming.pendingConfigs,
      incomingKeys
    ),
    staleConfigs: mergeBucketRecords(existing.staleConfigs, incoming.staleConfigs, incomingKeys),
    disabledConfigs: mergeBucketRecords(
      existing.disabledConfigs,
      incoming.disabledConfigs,
      incomingKeys
    ),
    configs: Array.from(byKey.values()),
  };
};

const completeWindowRefreshIfCovered = (
  state: OverviewStatusStateReducer,
  incoming: PaginatedOverviewStatus
) => {
  if (state.refreshThrough == null) {
    return;
  }
  if (incoming.total != null && incoming.total < state.refreshThrough) {
    state.refreshThrough = incoming.total;
  }
  if (!getNextWindowRefreshPage(incoming.page, incoming.perPage, state.refreshThrough)) {
    state.refreshThrough = undefined;
  }
};

const completeFillIfCovered = (
  state: OverviewStatusStateReducer,
  incoming: PaginatedOverviewStatus
) => {
  if (state.fillThrough == null) {
    return;
  }
  if (incoming.total != null && incoming.total < state.fillThrough) {
    state.fillThrough = incoming.total;
  }
  if (!getNextWindowRefreshPage(incoming.page, incoming.perPage, state.fillThrough)) {
    state.fillThrough = undefined;
  }
};

const armFillFromIncoming = (
  state: OverviewStatusStateReducer,
  incoming: PaginatedOverviewStatus
) => {
  if (!state.fillAllInFlight) {
    return;
  }
  state.fillAllInFlight = false;
  if (incoming.total != null) {
    state.fillThrough = incoming.total;
  }
};

const applyMergedPaginated = (
  state: OverviewStatusStateReducer,
  incoming: PaginatedOverviewStatus
) => {
  const existing = state.status;
  let allConfigs: OverviewStatusMetaData[];
  if (!existing?.configs || !incoming.configs) {
    state.status = incoming;
    allConfigs = incoming.configs ?? buildAllConfigs(incoming);
    state.total = incoming.total ?? allConfigs.length;
  } else {
    const merged = mergePaginatedStatus(existing, incoming);
    state.status = merged;
    allConfigs = merged.configs ?? [];
    state.total = incoming.total;
  }
  state.allConfigs = allConfigs;
  state.disabledConfigs = allConfigs.filter((monitor) => !monitor.isEnabled);
  state.loaded = true;
  state.loading = false;
  state.settled = true;
  applyStaleBeforeWindow(state);
};

export const overviewStatusReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(fetchOverviewStatusAction.get, (state, action) => {
      state.status = null;
      state.loading = true;
      state.silentReplaceInFlight = false;
      state.refreshThrough = undefined;
      state.fillThrough = undefined;
      state.fillAllInFlight = Boolean(action.payload.fillAll);
      state.lastRequest = toRequestContext(action.payload);
    })
    .addCase(quietFetchOverviewStatusAction.get, (state, action) => {
      // Timer refreshes pass `silent` so the compact table / progress bar
      // does not flash on every auto-refresh interval.
      if (!action.payload.silent) {
        state.loading = true;
      }
      state.silentReplaceInFlight = Boolean(action.payload.silent);
      const fillAll = Boolean(action.payload.fillAll);
      state.fillAllInFlight = fillAll;
      if (fillAll) {
        state.refreshThrough = undefined;
      } else {
        state.refreshThrough = action.payload.refreshThrough;
        state.fillThrough = undefined;
      }
      state.lastRequest = toRequestContext(action.payload);
    })
    .addCase(fetchOverviewStatusAction.success, (state, action) => {
      const incoming = action.payload;
      const existing = state.status;
      const silentReplaceInFlight = state.silentReplaceInFlight;
      state.silentReplaceInFlight = false;
      // A silent page-1 refresh can complete after the card view has already
      // appended later pages. Merge that prefix into the accumulated window.
      // Compact table paging is non-silent and must replace: a shorter last
      // page or a reduced `perPage` would otherwise keep stale rows.
      const isPageOne = incoming.page == null || incoming.page === 1;
      const preserveAccumulatedWindow =
        silentReplaceInFlight &&
        isPageOne &&
        Boolean(existing?.configs) &&
        Boolean(incoming.configs) &&
        existing!.configs!.length > incoming.configs!.length &&
        incoming.total === existing!.total;

      if (preserveAccumulatedWindow) {
        applyMergedPaginated(state, incoming);
        armFillFromIncoming(state, incoming);
        completeWindowRefreshIfCovered(state, incoming);
        completeFillIfCovered(state, incoming);
        return;
      }

      state.status = incoming;

      const allConfigs = incoming.configs ?? buildAllConfigs(state.status);
      state.allConfigs = allConfigs;
      state.total = incoming.configs ? incoming.total : allConfigs.length;
      state.disabledConfigs = allConfigs.filter((monitor) => !monitor.isEnabled);
      state.loaded = true;
      state.loading = false;
      state.settled = true;
      // Re-apply any resolved stale-before-window promotions so a background
      // refresh (which just replaced `status`) doesn't flicker them back to
      // `pending` until the supplementary lookup re-resolves.
      applyStaleBeforeWindow(state);
      armFillFromIncoming(state, incoming);
      completeWindowRefreshIfCovered(state, incoming);
      completeFillIfCovered(state, incoming);
    })
    .addCase(fetchOverviewStatusAction.fail, (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.settled = true;
      state.refreshThrough = undefined;
      state.fillThrough = undefined;
      state.fillAllInFlight = false;
    })
    .addCase(appendOverviewStatusAction.get, (state, action) => {
      if (!action.payload.silent) {
        // Keep the current page visible while the next one loads.
        state.loading = true;
        // User-driven infinite scroll cancels an in-flight window remainder.
        state.refreshThrough = undefined;
        state.fillThrough = undefined;
        state.fillAllInFlight = false;
      }
      state.pendingFillAppend = Boolean(action.payload.fillAll);
      state.pendingAppendRequest = toRequestContext(action.payload);
    })
    .addCase(appendOverviewStatusAction.success, (state, action) => {
      const pending = state.pendingAppendRequest;
      const wasFill = state.pendingFillAppend;
      state.pendingAppendRequest = undefined;
      state.pendingFillAppend = undefined;
      // Drop a page that was requested under a previous query/sort/filter so it
      // cannot land on top of a newer replace.
      if (pending && !requestContextEquals(pending, state.lastRequest)) {
        return;
      }
      // Drop a grouped fill page if grouping was cancelled before page 1 landed.
      if (wasFill && (state.fillAllInFlight || state.fillThrough == null)) {
        return;
      }
      const existingConfigs = state.status?.configs;
      const incoming =
        state.refreshThrough && existingConfigs && action.payload.configs
          ? restrictOverviewPageToExistingKeys(existingConfigs, action.payload)
          : action.payload;
      applyMergedPaginated(state, incoming);
      completeWindowRefreshIfCovered(state, action.payload);
      completeFillIfCovered(state, action.payload);
    })
    .addCase(appendOverviewStatusAction.fail, (state, action) => {
      state.pendingAppendRequest = undefined;
      state.pendingFillAppend = undefined;
      state.error = action.payload;
      state.loading = false;
      state.settled = true;
      state.refreshThrough = undefined;
      state.fillThrough = undefined;
      state.fillAllInFlight = false;
    })
    .addCase(fetchStaleStatusAction.success, (state, action) => {
      // Store the latest prior-run facts and promote the genuinely stale
      // monitors. Keeping the raw facts (rather than the derived metadata) lets
      // the same promotion be replayed on the next overview refresh. Counts are
      // recomputed by `selectOverviewStatus`; `applyStaleBeforeWindow` rebuilds
      // `allConfigs` when anything is promoted.
      state.staleBeforeWindowRuns = action.payload.priorRuns;
      applyStaleBeforeWindow(state);
    })
    .addCase(clearOverviewStatusErrorAction, (state) => {
      state.error = null;
    })
    .addCase(initialLoadReported, (state) => {
      state.isInitialLoad = false;
    });
});

export * from './actions';
export * from './effects';
export * from './selectors';
