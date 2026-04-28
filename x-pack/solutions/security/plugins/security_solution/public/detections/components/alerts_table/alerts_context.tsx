/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PropsWithChildren,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { AlertsTableImperativeApi } from '@kbn/response-ops-alerts-table/types';

/**
 * Context for sharing imperative APIs and in-flyout pagination state between
 * the alerts table and the alert details right panel.
 *
 * The flyout pagination spans the entire result set ("Discover-style"), so the
 * context tracks the absolute index of the currently expanded alert and the
 * total alert count, decoupled from whichever page the alerts table itself is
 * showing. The user's chosen table page is owned by `AlertsTableComponent`'s
 * local state and is not exposed here.
 */
interface AlertsContextValue {
  alertsTableRef: RefObject<AlertsTableImperativeApi>;
  /**
   * Absolute index (across all pages) of the alert currently shown in the
   * flyout, or `null` when no alert is expanded. The flyout pagination uses
   * this as `activePage`, computing the page-relative offset on demand.
   */
  flyoutAlertIndex: number | null;
  setFlyoutAlertIndex: Dispatch<SetStateAction<number | null>>;
  /** Current page size of the response-ops alerts table. */
  pageSize: number;
  setPageSize: Dispatch<SetStateAction<number>>;
  /**
   * Total number of alerts in the current query result (i.e. the response-ops
   * `alertsCount`). Drives `pageCount` of the in-flyout `EuiPagination`.
   */
  totalAlertCount: number;
  setTotalAlertCount: Dispatch<SetStateAction<number>>;
  /**
   * `true` while the alert at `flyoutAlertIndex` belongs to a different page
   * than the table is currently displaying and is being fetched. Consumers
   * (the right panel) should render a centered loading spinner instead of
   * stale alert content.
   */
  isFlyoutAlertLoading: boolean;
  setIsFlyoutAlertLoading: Dispatch<SetStateAction<boolean>>;
  /**
   * Mutable ref where `AlertsTableComponent` registers the implementation that
   * opens the document-details flyout for a given absolute alert index. The
   * implementation has access to the loaded alerts, the active scope id and
   * the expandable flyout API; consumers like `ActionsCell` and the in-flyout
   * pagination call `openAlertFlyout` (below) instead of writing flyout state
   * directly.
   *
   * This indirection keeps the AlertsContextProvider free of the expandable
   * flyout API (so it can be mounted outside that provider in the template
   * wrapper) while still letting any consumer trigger a flyout open.
   */
  openAlertFlyoutImplRef: MutableRefObject<((alertIndex: number) => void) | null>;
  /**
   * Stable wrapper around `openAlertFlyoutImplRef.current`. Calling this from
   * a row click or the in-flyout EuiPagination is the single entry point for
   * opening (or swapping) the alert details flyout. It is a no-op when no
   * implementation has been registered (e.g. on pages without an alerts
   * table).
   */
  openAlertFlyout: (alertIndex: number) => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

const AlertsContextProviderComponent = ({ children }: PropsWithChildren) => {
  const alertsTableRef = useRef<AlertsTableImperativeApi>(null);
  const [flyoutAlertIndex, setFlyoutAlertIndex] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState(0);
  const [totalAlertCount, setTotalAlertCount] = useState(0);
  const [isFlyoutAlertLoading, setIsFlyoutAlertLoading] = useState(false);
  const openAlertFlyoutImplRef = useRef<((alertIndex: number) => void) | null>(null);
  const openAlertFlyout = useCallback((alertIndex: number) => {
    openAlertFlyoutImplRef.current?.(alertIndex);
  }, []);

  const contextValue = useMemo<AlertsContextValue>(
    () => ({
      alertsTableRef,
      flyoutAlertIndex,
      setFlyoutAlertIndex,
      pageSize,
      setPageSize,
      totalAlertCount,
      setTotalAlertCount,
      isFlyoutAlertLoading,
      setIsFlyoutAlertLoading,
      openAlertFlyoutImplRef,
      openAlertFlyout,
    }),
    [flyoutAlertIndex, pageSize, totalAlertCount, isFlyoutAlertLoading, openAlertFlyout]
  );

  return <AlertsContext.Provider value={contextValue}>{children}</AlertsContext.Provider>;
};

export const AlertsContextProvider = memo(AlertsContextProviderComponent);

export const useAlertsContext = (): AlertsContextValue => {
  const fallbackRef = useRef<AlertsTableImperativeApi>(null);
  const fallbackImplRef = useRef<((alertIndex: number) => void) | null>(null);
  const noop = useCallback(() => {}, []);
  const value = useContext(AlertsContext);
  if (!value) {
    return {
      alertsTableRef: fallbackRef,
      flyoutAlertIndex: null,
      setFlyoutAlertIndex: noop,
      pageSize: 0,
      setPageSize: noop,
      totalAlertCount: 0,
      setTotalAlertCount: noop,
      isFlyoutAlertLoading: false,
      setIsFlyoutAlertLoading: noop,
      openAlertFlyoutImplRef: fallbackImplRef,
      openAlertFlyout: noop,
    };
  }
  return value;
};
