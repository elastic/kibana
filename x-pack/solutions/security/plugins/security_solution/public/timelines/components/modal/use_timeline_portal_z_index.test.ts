/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getFlyoutManagerStore } from '@elastic/eui';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useTimelinePortalZIndex } from './use_timeline_portal_z_index';

const TIMELINE_UNMANAGED_FLYOUT_ID = 'security-solution-timeline';

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

jest.mock('../../../common/hooks/use_is_new_flyout_enabled');

describe('useTimelinePortalZIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ currentZIndex: 0 });
  });

  it('returns undefined and does not register when the new flyout system is disabled', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useTimelinePortalZIndex(true));

    expect(result.current).toBeUndefined();
    expect(getFlyoutManagerStore).not.toHaveBeenCalled();
  });

  it('returns undefined and does not register when Timeline is not visible, even if enabled', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useTimelinePortalZIndex(false));

    expect(result.current).toBeUndefined();
    expect(getFlyoutManagerStore).not.toHaveBeenCalled();
  });

  it('registers as an unmanaged flyout and returns flyoutLevel + currentZIndex when enabled and visible', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);
    mockGetState.mockReturnValue({ currentZIndex: 6 });

    const { result } = renderHook(() => useTimelinePortalZIndex(true));

    expect(result.current).toBe(1006);
    expect(mockAddUnmanagedFlyout).toHaveBeenCalledWith(TIMELINE_UNMANAGED_FLYOUT_ID);
  });

  it('unregisters the unmanaged flyout on unmount', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

    const { unmount } = renderHook(() => useTimelinePortalZIndex(true));
    unmount();

    expect(mockCloseUnmanagedFlyout).toHaveBeenCalledWith(TIMELINE_UNMANAGED_FLYOUT_ID);
  });

  it('unregisters and resets the z-index when Timeline transitions from visible to hidden', () => {
    (useIsNewFlyoutEnabled as jest.Mock).mockReturnValue(true);

    const { result, rerender } = renderHook(({ visible }) => useTimelinePortalZIndex(visible), {
      initialProps: { visible: true },
    });
    expect(result.current).toBeDefined();

    rerender({ visible: false });

    expect(mockCloseUnmanagedFlyout).toHaveBeenCalledWith(TIMELINE_UNMANAGED_FLYOUT_ID);
    expect(result.current).toBeUndefined();
  });
});
