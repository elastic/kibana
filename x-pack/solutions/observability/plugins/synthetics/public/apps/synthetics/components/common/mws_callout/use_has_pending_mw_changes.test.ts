/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as redux from 'react-redux';
import { MaintenanceWindowStatus } from '@kbn/maintenance-windows-plugin/common';
import { useHasPendingMwChanges } from './use_has_pending_mw_changes';
import { useFetchMaintenanceWindows } from '../../../hooks';
import { selectDynamicSettings } from '../../../state/settings/selectors';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useFetchMaintenanceWindows: jest.fn().mockReturnValue({ data: undefined }),
}));

const mockUseSelector = redux.useSelector as jest.MockedFunction<typeof redux.useSelector>;
const mockDispatch = jest.fn();
const mockUseFetchMWs = useFetchMaintenanceWindows as unknown as jest.MockedFunction<
  () => {
    data?: {
      maintenanceWindows: Array<{
        id: string;
        title: string;
        status: MaintenanceWindowStatus;
        updatedAt: string;
      }>;
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

const setMWs = (mws: Array<ReturnType<typeof mockMW>>) => {
  mockUseFetchMWs.mockReturnValue({
    data: { maintenanceWindows: mws },
  });
};

describe('useHasPendingMwChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redux.useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    mockUseFetchMWs.mockReturnValue({ data: undefined });

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });
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

  it('detects recently modified inactive MW as pending change', () => {
    const recentlyUpdated = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
    setMWs([mockMW('mw-1', recentlyUpdated)]);

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(true);
  });

  it('returns no pending changes for MW updated longer ago than sync interval', () => {
    const oldUpdate = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
    setMWs([mockMW('mw-1', oldUpdate)]);

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
});
