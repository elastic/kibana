/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';

/**
 * Snapshot of the alerts pagination store. The shape is intentionally flat and
 * fully immutable so that `useSyncExternalStore` consumers get a new reference
 * on every mutation and re-render reliably.
 */
export interface AlertsTablePaginationState {
  /**
   * Absolute index (across all pages) of the alert currently shown in the
   * flyout, or `null` when no alert is expanded. Drives `activePage` of the
   * in-flyout `EuiPagination`.
   */
  flyoutAlertIndex: number | null;
  /** Current page size of the response-ops alerts table. */
  pageSize: number;
  /**
   * Total number of alerts in the current query result. Drives `pageCount`
   * of the in-flyout `EuiPagination`.
   */
  totalAlertCount: number;
  /**
   * `true` while the alert at `flyoutAlertIndex` belongs to a different page
   * than the table is currently displaying and is being fetched. Consumers
   * (the right panel) should render a centered loading spinner instead of
   * stale alert content.
   */
  isFlyoutAlertLoading: boolean;
  /**
   * Resolved alert document at `flyoutAlertIndex`, or `null` while no alert
   * is expanded. The Flyout V2 paginated wrapper renders this directly,
   * bypassing the per-id `useEsDocSearch` fetch that the non-paginated
   * wrapper uses.
   */
  flyoutAlert: Alert | null;
  /**
   * Implementation registered by `AlertsTableComponent` that opens (or swaps)
   * the document-details flyout for a given absolute alert index. Lives in
   * the store rather than a React ref so that V2 flyout content mounted in a
   * separate React root via `overlays.openSystemFlyout` can still dispatch.
   *
   * `null` when no alerts table has registered an implementation; callers
   * (e.g. the in-flyout pagination, the row-expand action) treat that case
   * as a no-op.
   */
  openAlertFlyoutImpl: ((alertIndex: number) => void) | null;
}

const initialState: AlertsTablePaginationState = {
  flyoutAlertIndex: null,
  pageSize: 0,
  totalAlertCount: 0,
  isFlyoutAlertLoading: false,
  flyoutAlert: null,
  openAlertFlyoutImpl: null,
};

let state: AlertsTablePaginationState = initialState;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const alertsTablePaginationStore = {
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Returns the current snapshot. Reference identity changes on every
   * `setState` call so that `useSyncExternalStore` triggers a re-render.
   */
  getSnapshot: (): AlertsTablePaginationState => state,

  /**
   * Merge a partial update into the state and notify subscribers. No-ops when
   * the resulting object would be shallow-equal to the previous one, to avoid
   * spurious re-renders (e.g. when `setIsFlyoutAlertLoading(false)` runs in
   * an effect after each table page resolves).
   */
  setState: (partial: Partial<AlertsTablePaginationState>): void => {
    let changed = false;
    for (const key of Object.keys(partial) as Array<keyof AlertsTablePaginationState>) {
      if (partial[key] !== state[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...partial };
    notify();
  },

  /**
   * Reset the singleton to its initial state. Intended for tests and for the
   * `AlertsContextProvider` unmount lifecycle so that leaving the alerts page
   * clears any lingering pagination state.
   */
  reset: (): void => {
    if (state === initialState) return;
    state = initialState;
    notify();
  },
};

/**
 * Test-only helper. Resets the singleton store and clears listeners so that
 * each test starts from a clean slate without leaking subscriptions across
 * suites.
 */
export const __resetAlertsTablePaginationStoreForTests = (): void => {
  state = initialState;
  listeners.clear();
};
