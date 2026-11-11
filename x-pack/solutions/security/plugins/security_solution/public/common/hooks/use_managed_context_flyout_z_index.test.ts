/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { getFlyoutManagerStore, useIsInManagedFlyout } from '@elastic/eui';
import { useManagedContextFlyoutZIndex } from './use_managed_context_flyout_z_index';

const mockGetState = jest.fn(() => ({ currentZIndex: 0 }));

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  getFlyoutManagerStore: jest.fn(() => ({ getState: mockGetState })),
  useIsInManagedFlyout: jest.fn(),
  useEuiTheme: () => ({ euiTheme: { levels: { flyout: 1000 } } }),
}));

describe('useManagedContextFlyoutZIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({ currentZIndex: 0 });
  });

  it('returns undefined when not active', () => {
    (useIsInManagedFlyout as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useManagedContextFlyoutZIndex(false));

    expect(result.current).toBeUndefined();
    expect(getFlyoutManagerStore).not.toHaveBeenCalled();
  });

  it('returns undefined when active but not inside a managed flyout (EUI handles stacking)', () => {
    (useIsInManagedFlyout as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useManagedContextFlyoutZIndex(true));

    expect(result.current).toBeUndefined();
    expect(getFlyoutManagerStore).not.toHaveBeenCalled();
  });

  it('returns flyoutLevel + currentZIndex when active and inside a managed flyout', () => {
    (useIsInManagedFlyout as jest.Mock).mockReturnValue(true);
    mockGetState.mockReturnValue({ currentZIndex: 5 });

    const { result } = renderHook(() => useManagedContextFlyoutZIndex(true));

    expect(result.current).toBe(1005);
  });

  it('captures the z-index when opened and keeps it stable across re-renders', () => {
    (useIsInManagedFlyout as jest.Mock).mockReturnValue(true);
    mockGetState.mockReturnValue({ currentZIndex: 5 });

    const { result, rerender } = renderHook(() => useManagedContextFlyoutZIndex(true));
    expect(result.current).toBe(1005);

    // A later change to the shared counter must not move an already-open flyout.
    mockGetState.mockReturnValue({ currentZIndex: 9 });
    rerender();

    expect(result.current).toBe(1005);
  });

  it('recomputes the next time it is opened', () => {
    (useIsInManagedFlyout as jest.Mock).mockReturnValue(true);
    mockGetState.mockReturnValue({ currentZIndex: 5 });

    const { result, rerender } = renderHook(({ active }) => useManagedContextFlyoutZIndex(active), {
      initialProps: { active: true },
    });
    expect(result.current).toBe(1005);

    rerender({ active: false });
    expect(result.current).toBeUndefined();

    mockGetState.mockReturnValue({ currentZIndex: 7 });
    rerender({ active: true });
    expect(result.current).toBe(1007);
  });
});
