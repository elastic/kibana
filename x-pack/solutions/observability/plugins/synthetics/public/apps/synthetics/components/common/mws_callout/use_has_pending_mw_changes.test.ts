/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import * as redux from 'react-redux';
import * as alertsShared from '@kbn/alerts-ui-shared';
import { useHasPendingMwChanges } from './use_has_pending_mw_changes';
import { selectMaintenanceWindowsState } from '../../../state/maintenance_windows';
import { selectDynamicSettings } from '../../../state/settings/selectors';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

jest.mock('@kbn/alerts-ui-shared', () => ({
  useFetchActiveMaintenanceWindows: jest.fn().mockReturnValue({ data: [] }),
}));

jest.mock('../../../contexts', () => ({
  useSyntheticsRefreshContext: jest.fn().mockReturnValue({ lastRefresh: 0 }),
}));

const mockUseSelector = redux.useSelector as jest.MockedFunction<typeof redux.useSelector>;
const mockDispatch = jest.fn();
const mockUseFetchActiveMWs =
  alertsShared.useFetchActiveMaintenanceWindows as unknown as jest.MockedFunction<
    () => { data: Array<{ id: string; title: string }> }
  >;

const mockMW = (id: string, updatedAt: string) => ({
  id,
  title: `MW ${id}`,
  updated_at: updatedAt,
});

describe('useHasPendingMwChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redux.useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    mockUseFetchActiveMWs.mockReturnValue({ data: [] });

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: null };
      }
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

  it('returns no pending changes when allMWsData is not yet loaded', () => {
    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('detects deleted MW as pending change', () => {
    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: { data: [] } };
      }
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-deleted']));

    expect(result.current.hasPendingChanges).toBe(true);
  });

  it('detects recently modified inactive MW as pending change', () => {
    const recentlyUpdated = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: { data: [mockMW('mw-1', recentlyUpdated)] } };
      }
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(true);
  });

  it('returns no pending changes for MW updated longer ago than sync interval', () => {
    const oldUpdate = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: { data: [mockMW('mw-1', oldUpdate)] } };
      }
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(false);
  });

  it('returns no pending changes when MW is currently active', () => {
    const recentlyUpdated = new Date(Date.now() - 60 * 1000).toISOString();

    mockUseFetchActiveMWs.mockReturnValue({
      data: [{ id: 'mw-1', title: 'MW 1' }],
    });

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: { data: [mockMW('mw-1', recentlyUpdated)] } };
      }
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.hasPendingChanges).toBe(false);
    expect(result.current.activeMWs).toHaveLength(1);
  });

  it('filters activeMWs to only those referenced by the monitor', () => {
    mockUseFetchActiveMWs.mockReturnValue({
      data: [
        { id: 'mw-1', title: 'MW 1' },
        { id: 'mw-other', title: 'MW Other' },
      ],
    });

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: { data: [mockMW('mw-1', new Date().toISOString())] } };
      }
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1']));

    expect(result.current.activeMWs).toEqual([{ id: 'mw-1', title: 'MW 1' }]);
  });

  it('detects pending changes when one of multiple MWs is deleted', () => {
    const recentlyUpdated = new Date(Date.now() - 60 * 1000).toISOString();

    mockUseSelector.mockImplementation((selector: any) => {
      if (selector === selectMaintenanceWindowsState) {
        return { data: { data: [mockMW('mw-1', recentlyUpdated)] } };
      }
      if (selector === selectDynamicSettings) {
        return { settings: { privateLocationsSyncInterval: 5 } };
      }
      return undefined;
    });

    const { result } = renderHook(() => useHasPendingMwChanges(['mw-1', 'mw-deleted']));

    expect(result.current.hasPendingChanges).toBe(true);
  });
});
