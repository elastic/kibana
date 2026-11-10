/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { MaintenanceWindowStatus } from '@kbn/maintenance-windows-plugin/common';
import { useHasPendingMwChanges } from './use_has_pending_mw_changes';
import { useFetchMaintenanceWindows } from '../../../hooks';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useFetchMaintenanceWindows: jest.fn().mockReturnValue({ data: undefined }),
}));

const mockUseFetchMWs = useFetchMaintenanceWindows as unknown as jest.MockedFunction<
  () => {
    data?: {
      maintenanceWindows: Array<{
        id: string;
        title: string;
        status: MaintenanceWindowStatus;
        updatedAt: string;
      }>;
      lastSuccessfulSyncAt?: string;
      autoSyncDisabled?: boolean;
    };
  }
>;

const mockMW = (
  id: string,
  updatedAt: string,
  status: MaintenanceWindowStatus = MaintenanceWindowStatus.Upcoming
) => ({
  id,
  title: `MW ${id}`,
  status,
  updatedAt,
});

const setMWs = (
  mws: Array<ReturnType<typeof mockMW>>,
  syncStatus: { lastSuccessfulSyncAt?: string; autoSyncDisabled?: boolean } = {}
) => {
  mockUseFetchMWs.mockReturnValue({
    data: { maintenanceWindows: mws, ...syncStatus },
  });
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();

describe('useHasPendingMwChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchMWs.mockReturnValue({ data: undefined });
  });

  it('returns no pending changes when monitor has no MWs', () => {
    const { result } = renderHook(() => useHasPendingMwChanges([]));

    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.activeMWs).toEqual([]);
  });

  it('returns no pending changes when maintenance windows are not yet loaded', () => {
    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('detects deleted MW as pending change', () => {
    setMWs([]);

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-deleted']));

    expect(result.current.hasPendingChanges).toBe(true);
  });

  it('does not treat an existing inactive MW as pending after an edit', () => {
    setMWs([mockMW('mw-1', new Date().toISOString())]);

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('returns no pending changes when MW is currently active', () => {
    const recentlyUpdated = new Date(Date.now() - 60 * 1000).toISOString();
    setMWs([mockMW('mw-1', recentlyUpdated, MaintenanceWindowStatus.Running)]);

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.activeMWs).toHaveLength(1);
  });

  it('filters activeMWs to only those referenced by the monitor', () => {
    setMWs([
      mockMW('mw-1', new Date().toISOString(), MaintenanceWindowStatus.Running),
      mockMW('mw-other', new Date().toISOString(), MaintenanceWindowStatus.Running),
    ]);

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.activeMWs.map((mw) => mw.id)).toEqual(['mw-1']);
  });

  it('detects pending changes when one of multiple MWs is deleted', () => {
    const recentlyUpdated = new Date(Date.now() - 60 * 1000).toISOString();
    setMWs([mockMW('mw-1', recentlyUpdated)]);

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1', 'mw-deleted']));

    expect(result.current.hasPendingChanges).toBe(true);
  });

  describe('overdue sync', () => {
    it('flags a change made after the last successful sync once the grace period passed', () => {
      setMWs([mockMW('mw-1', minutesAgo(10))], { lastSuccessfulSyncAt: minutesAgo(60) });

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(true);
      expect(result.current.hasPendingChanges).toBe(true);
    });

    it('flags it while the MW is active too', () => {
      setMWs([mockMW('mw-1', minutesAgo(10), MaintenanceWindowStatus.Running)], {
        lastSuccessfulSyncAt: minutesAgo(60),
      });

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(true);
      expect(result.current.activeMWs).toHaveLength(1);
    });

    it('waits out the grace period for a fresh change', () => {
      setMWs([mockMW('mw-1', minutesAgo(1))], { lastSuccessfulSyncAt: minutesAgo(60) });

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(false);
      expect(result.current.hasPendingChanges).toBe(false);
    });

    it('is not overdue once a sync completed after the change', () => {
      setMWs([mockMW('mw-1', minutesAgo(30))], { lastSuccessfulSyncAt: minutesAgo(10) });

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(false);
    });

    it('is not overdue while auto sync is disabled', () => {
      setMWs([mockMW('mw-1', minutesAgo(30))], {
        lastSuccessfulSyncAt: minutesAgo(60),
        autoSyncDisabled: true,
      });

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(false);
    });

    it('is not overdue when the sync status is unknown', () => {
      setMWs([mockMW('mw-1', minutesAgo(30))]);

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(false);
    });

    it('ignores MWs the monitor does not reference', () => {
      setMWs([mockMW('mw-1', minutesAgo(90)), mockMW('mw-other', minutesAgo(10))], {
        lastSuccessfulSyncAt: minutesAgo(60),
      });

      const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

      expect(result.current.isSyncOverdue).toBe(false);
    });
  });
});
