/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  memo,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';
import {
  alertsTablePaginationStore,
  type AlertsTablePaginationState,
} from './alerts_table_pagination_store';

/**
 * Hook return type for sharing imperative APIs and in-flyout pagination state
 * between the alerts table and the alert details right panel.
 *
 * The flyout pagination spans the entire result set ("Discover-style"), so
 * the value tracks the absolute index of the currently expanded alert and
 * the total alert count, decoupled from whichever page the alerts table
 * itself is showing. The user's chosen table page is owned by
 * `AlertsTableComponent`'s local state and is not exposed here.
 *
 * The state is backed by a module-level external store
 * (`alertsTablePaginationStore`) and read via `useSyncExternalStore` so that
 * Flyout V2 content — which is mounted in a separate React root by
 * `overlays.openSystemFlyout` — can read and update the same state as the
 * alerts page tree.
 */
interface AlertsContextValue {
  alertsTableRef: RefObject<AlertsTableImperativeApi>;
  /**
   * Absolute index (across all pages) of the alert currently shown in the
   * flyout, or `null` when no alert is expanded. The flyout pagination uses
   * this as `activePage`, computing the page-relative offset on demand.
   */
  flyoutAlertIndex: number | null;
  setFlyoutAlertIndex: (value: number | null) => void;
  /** Current page size of the response-ops alerts table. */
  pageSize: number;
  setPageSize: (value: number) => void;
  /**
   * Total number of alerts in the current query result (i.e. the response-ops
   * `alertsCount`). Drives `pageCount` of the in-flyout `EuiPagination`.
   */
  totalAlertCount: number;
  setTotalAlertCount: (value: number) => void;
  /**
   * `true` while the alert at `flyoutAlertIndex` belongs to a different page
   * than the table is currently displaying and is being fetched. Consumers
   * (the right panel) should render a centered loading spinner instead of
   * stale alert content.
   */
  isFlyoutAlertLoading: boolean;
  setIsFlyoutAlertLoading: (value: boolean) => void;
  /**
   * Resolved alert document at `flyoutAlertIndex`, or `null` while no alert
   * is expanded. Used by the Flyout V2 paginated wrapper to render the
   * current alert directly, without an extra `useEsDocSearch` round-trip.
   */
  flyoutAlert: Alert | null;
  setFlyoutAlert: (value: Alert | null) => void;
  /**
   * Setter that registers (or clears) the implementation that opens the
   * document-details flyout for a given absolute alert index. The
   * implementation has access to the loaded alerts, the active scope id and
   * the appropriate flyout API; consumers like `ActionsCell` and the
   * in-flyout pagination call `openAlertFlyout` (below) instead of writing
   * flyout state directly.
   */
  setOpenAlertFlyoutImpl: (impl: ((alertIndex: number) => void) | null) => void;
  /**
   * Stable wrapper around the registered implementation. Calling this from a
   * row click or the in-flyout `EuiPagination` is the single entry point for
   * opening (or swapping) the alert details flyout. It is a no-op when no
   * implementation has been registered (e.g. on pages without an alerts
   * table).
   */
  openAlertFlyout: (alertIndex: number) => void;
}

// Module-scoped imperative ref. Only one alerts table is mounted at a time in
// the security app, and this ref is not part of the reactive store. Placing
// it here lets `useAlertsContext()` work outside any provider, mirroring how
// the store-backed state is shared across React roots.
const alertsTableRefSingleton: RefObject<AlertsTableImperativeApi> = { current: null };

const setFlyoutAlertIndex = (value: number | null): void => {
  alertsTablePaginationStore.setState({ flyoutAlertIndex: value });
};
const setPageSize = (value: number): void => {
  alertsTablePaginationStore.setState({ pageSize: value });
};
const setTotalAlertCount = (value: number): void => {
  alertsTablePaginationStore.setState({ totalAlertCount: value });
};
const setIsFlyoutAlertLoading = (value: boolean): void => {
  alertsTablePaginationStore.setState({ isFlyoutAlertLoading: value });
};
const setFlyoutAlert = (value: Alert | null): void => {
  alertsTablePaginationStore.setState({ flyoutAlert: value });
};
const setOpenAlertFlyoutImpl = (impl: ((alertIndex: number) => void) | null): void => {
  alertsTablePaginationStore.setState({ openAlertFlyoutImpl: impl });
};

const openAlertFlyout = (alertIndex: number): void => {
  alertsTablePaginationStore.getSnapshot().openAlertFlyoutImpl?.(alertIndex);
};

/**
 * Provider component preserved for backwards compatibility with the existing
 * `SecuritySolutionTemplateWrapper` mount point. It does not own any React
 * state — the actual state lives in `alertsTablePaginationStore` — but it
 * resets the singleton store on unmount so that leaving the alerts page does
 * not leak pagination state into other routes.
 */
const AlertsContextProviderComponent = ({ children }: PropsWithChildren) => {
  useEffect(() => {
    return () => {
      alertsTablePaginationStore.reset();
    };
  }, []);
  return <>{children}</>;
};

export const AlertsContextProvider = memo(AlertsContextProviderComponent);

export const useAlertsContext = (): AlertsContextValue => {
  const snapshot = useSyncExternalStore<AlertsTablePaginationState>(
    alertsTablePaginationStore.subscribe,
    alertsTablePaginationStore.getSnapshot,
    alertsTablePaginationStore.getSnapshot
  );

  return useMemo<AlertsContextValue>(
    () => ({
      alertsTableRef: alertsTableRefSingleton,
      flyoutAlertIndex: snapshot.flyoutAlertIndex,
      setFlyoutAlertIndex,
      pageSize: snapshot.pageSize,
      setPageSize,
      totalAlertCount: snapshot.totalAlertCount,
      setTotalAlertCount,
      isFlyoutAlertLoading: snapshot.isFlyoutAlertLoading,
      setIsFlyoutAlertLoading,
      flyoutAlert: snapshot.flyoutAlert,
      setFlyoutAlert,
      setOpenAlertFlyoutImpl,
      openAlertFlyout,
    }),
    [snapshot]
  );
};
