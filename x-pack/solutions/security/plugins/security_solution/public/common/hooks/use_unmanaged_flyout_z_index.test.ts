/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getFlyoutManagerStore } from '@elastic/eui';
import { useIsNewFlyoutEnabled } from './use_is_new_flyout_enabled';
import { useUnmanagedFlyoutZIndex } from './use_unmanaged_flyout_z_index';

const TEST_ID = 'test-unmanaged-flyout';

const mockAddUnmanagedFlyout = jest.fn();
const mockCloseUnmanagedFlyout = jest.fn();
const mockGetState = jest.fn(() => ({ currentZIndex: 0 }));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  getFlyoutManagerStore: jest.fn(() => ({
    getState: mockGetState,
    addUnmanagedFlyout: mockAddUnmanagedFlyout,
    closeUnmanagedFlyout: mockCloseUnmanagedFlyout,
  })),
  useEuiTheme: () => ({ euiTheme: { levels: { flyout: 1000 } } }),
}));

jest.mock('./use_is_new_flyout_enabled');

describe('useUnmanagedFlyoutZIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ currentZIndex: 0 });
  });

  it('returns undefined and does not register when the new flyout system is disabled', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useUnmanagedFlyoutZIndex({ id: TEST_ID, active: true }));

    expect(result.current).toBeUndefined();
    expect(getFlyoutManagerStore).not.toHaveBeenCalled();
  });

  it('returns undefined and does not register when not active, even if enabled', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useUnmanagedFlyoutZIndex({ id: TEST_ID, active: false }));

    expect(result.current).toBeUndefined();
    expect(getFlyoutManagerStore).not.toHaveBeenCalled();
  });

  it('registers as an unmanaged flyout and returns flyoutLevel + currentZIndex when enabled and active', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);
    mockGetState.mockReturnValue({ currentZIndex: 6 });

    const { result } = renderHook(() => useUnmanagedFlyoutZIndex({ id: TEST_ID, active: true }));

    expect(result.current).toBe(1006);
    expect(mockAddUnmanagedFlyout).toHaveBeenCalledWith(TEST_ID);
  });

  it('unregisters the unmanaged flyout on unmount', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

    const { unmount } = renderHook(() => useUnmanagedFlyoutZIndex({ id: TEST_ID, active: true }));
    unmount();

    expect(mockCloseUnmanagedFlyout).toHaveBeenCalledWith(TEST_ID);
  });

  it('unregisters and resets the z-index when transitioning from active to inactive', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

    const { result, rerender } = renderHook(
      ({ active }) => useUnmanagedFlyoutZIndex({ id: TEST_ID, active }),
      {
        initialProps: { active: true },
      }
    );
    expect(result.current).toBeDefined();

    rerender({ active: false });

    expect(mockCloseUnmanagedFlyout).toHaveBeenCalledWith(TEST_ID);
    expect(result.current).toBeUndefined();
  });
});
