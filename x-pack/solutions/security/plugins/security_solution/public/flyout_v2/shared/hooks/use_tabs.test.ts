/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useTabs } from './use_tabs';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

const mockStorage = {
  get: jest.fn(),
  set: jest.fn(),
};

const validTabIds = ['overview', 'table', 'json'] as const;
type TabId = (typeof validTabIds)[number];
const STORAGE_KEY = 'test.selectedTab';

describe('useTabs (shared)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { storage: mockStorage } });
  });

  it('falls back to the first valid tab id when nothing else resolves', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY }));
    expect(result.current.selectedTabId).toBe('overview');
  });

  it('prefers initialTabId over storage and the fallback', () => {
    mockStorage.get.mockReturnValue('json');
    const { result } = renderHook(() =>
      useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY, initialTabId: 'table' })
    );
    expect(result.current.selectedTabId).toBe('table');
  });

  it('ignores an invalid initialTabId and falls back to storage', () => {
    mockStorage.get.mockReturnValue('json');
    const { result } = renderHook(() =>
      useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY, initialTabId: 'invalid' })
    );
    expect(result.current.selectedTabId).toBe('json');
  });

  it('uses the stored tab when no initialTabId is provided', () => {
    mockStorage.get.mockReturnValue('json');
    const { result } = renderHook(() => useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY }));
    expect(mockStorage.get).toHaveBeenCalledWith(STORAGE_KEY);
    expect(result.current.selectedTabId).toBe('json');
  });

  it('ignores an invalid stored tab and falls back to the first valid tab id', () => {
    mockStorage.get.mockReturnValue('nope');
    const { result } = renderHook(() => useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY }));
    expect(result.current.selectedTabId).toBe('overview');
  });

  it('persists the selection to storage when setSelectedTabId is called', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY }));

    act(() => result.current.setSelectedTabId('json'));

    expect(result.current.selectedTabId).toBe('json');
    expect(mockStorage.set).toHaveBeenCalledWith(STORAGE_KEY, 'json');
  });

  it('syncs to a changed initialTabId without writing to storage', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result, rerender } = renderHook(
      ({ initialTabId }: { initialTabId?: string }) =>
        useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY, initialTabId }),
      { initialProps: { initialTabId: 'overview' } }
    );

    expect(result.current.selectedTabId).toBe('overview');

    rerender({ initialTabId: 'table' });

    expect(result.current.selectedTabId).toBe('table');
    // URL-driven sync must not overwrite the persisted preference.
    expect(mockStorage.set).not.toHaveBeenCalled();
  });

  it('does not override a user selection when initialTabId is unchanged across renders', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result, rerender } = renderHook(
      ({ initialTabId }: { initialTabId?: string }) =>
        useTabs<TabId>({ validTabIds, storageKey: STORAGE_KEY, initialTabId }),
      { initialProps: { initialTabId: 'overview' } }
    );

    act(() => result.current.setSelectedTabId('json'));
    expect(result.current.selectedTabId).toBe('json');

    // Re-render with the same initialTabId — the render-phase sync must not fire.
    rerender({ initialTabId: 'overview' });
    expect(result.current.selectedTabId).toBe('json');
  });
});
