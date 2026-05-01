/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { AlertsContextProvider, useAlertsContext } from './alerts_context';
import {
  __resetAlertsTablePaginationStoreForTests,
  alertsTablePaginationStore,
} from './alerts_table_pagination_store';

const sampleAlert = { _id: 'alert-1', _index: 'index-1' } as unknown as Alert;

describe('AlertsContext', () => {
  beforeEach(() => {
    __resetAlertsTablePaginationStoreForTests();
  });

  describe('without a provider', () => {
    it('returns the singleton store snapshot so consumers can render in unrelated trees', () => {
      const { result } = renderHook(() => useAlertsContext());

      expect(result.current.flyoutAlertIndex).toBeNull();
      expect(result.current.pageSize).toBe(0);
      expect(result.current.totalAlertCount).toBe(0);
      expect(result.current.isFlyoutAlertLoading).toBe(false);
      expect(result.current.flyoutAlert).toBeNull();
      expect(result.current.alertsTableRef.current).toBeNull();

      // Calling `openAlertFlyout` outside a provider must be a no-op so the
      // alert details right panel can render in trees that have no alerts
      // page (e.g. unrelated routes).
      expect(() => result.current.openAlertFlyout(3)).not.toThrow();
    });
  });

  describe('within an AlertsContextProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AlertsContextProvider>{children}</AlertsContextProvider>
    );

    it('exposes setters that update the flyout pagination state', () => {
      const { result } = renderHook(() => useAlertsContext(), { wrapper });

      expect(result.current.flyoutAlertIndex).toBeNull();
      expect(result.current.pageSize).toBe(0);
      expect(result.current.totalAlertCount).toBe(0);
      expect(result.current.isFlyoutAlertLoading).toBe(false);
      expect(result.current.flyoutAlert).toBeNull();

      act(() => {
        result.current.setPageSize(50);
        result.current.setTotalAlertCount(1432);
        result.current.setFlyoutAlertIndex(125);
        result.current.setIsFlyoutAlertLoading(true);
        result.current.setFlyoutAlert(sampleAlert);
      });

      expect(result.current.pageSize).toBe(50);
      expect(result.current.totalAlertCount).toBe(1432);
      expect(result.current.flyoutAlertIndex).toBe(125);
      expect(result.current.isFlyoutAlertLoading).toBe(true);
      expect(result.current.flyoutAlert).toBe(sampleAlert);
    });

    it('forwards openAlertFlyout to the implementation registered via setOpenAlertFlyoutImpl', () => {
      const { result } = renderHook(() => useAlertsContext(), { wrapper });
      const impl = jest.fn();

      act(() => {
        result.current.setOpenAlertFlyoutImpl(impl);
      });

      result.current.openAlertFlyout(7);

      expect(impl).toHaveBeenCalledTimes(1);
      expect(impl).toHaveBeenCalledWith(7);
    });

    it('treats openAlertFlyout as a no-op if no implementation is registered', () => {
      const { result } = renderHook(() => useAlertsContext(), { wrapper });

      expect(() => result.current.openAlertFlyout(0)).not.toThrow();
    });

    it('keeps openAlertFlyout stable across state updates', () => {
      const { result } = renderHook(() => useAlertsContext(), { wrapper });
      const initial = result.current.openAlertFlyout;

      act(() => {
        result.current.setFlyoutAlertIndex(1);
      });

      expect(result.current.openAlertFlyout).toBe(initial);
    });

    it('resets the singleton store when the provider unmounts', () => {
      const { unmount } = render(
        <AlertsContextProvider>
          <div />
        </AlertsContextProvider>
      );

      act(() => {
        alertsTablePaginationStore.setState({ flyoutAlertIndex: 12, totalAlertCount: 99 });
      });
      expect(alertsTablePaginationStore.getSnapshot().flyoutAlertIndex).toBe(12);

      unmount();

      expect(alertsTablePaginationStore.getSnapshot().flyoutAlertIndex).toBeNull();
      expect(alertsTablePaginationStore.getSnapshot().totalAlertCount).toBe(0);
    });
  });

  describe('cross-tree state sharing', () => {
    it('mounts in two independent trees and stays in sync via the singleton store', () => {
      const { result: pageTree } = renderHook(() => useAlertsContext(), {
        wrapper: AlertsContextProvider,
      });
      const { result: flyoutTree } = renderHook(() => useAlertsContext());

      act(() => {
        pageTree.current.setFlyoutAlertIndex(42);
        pageTree.current.setFlyoutAlert(sampleAlert);
      });

      expect(flyoutTree.current.flyoutAlertIndex).toBe(42);
      expect(flyoutTree.current.flyoutAlert).toBe(sampleAlert);
    });
  });
});
