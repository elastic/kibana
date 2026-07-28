/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { usePaginatedFlyout } from './use_paginated_flyout';
import { __resetFlyoutPaginationStoreForTests, flyoutPaginationStore } from './store';
import { absentSlice } from './types';
import {
  FLYOUT_ORIGIN,
  FLYOUT_SESSION_KIND,
  FLYOUT_SURFACE,
  FLYOUT_TYPE,
} from '../../../common/lib/telemetry';
import { useOpenFlyout } from '../../shared/hooks/use_open_flyout';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../../shared/hooks/use_open_flyout');

jest.mock('../../shared/hooks/use_default_flyout_properties', () => ({
  useDefaultDocumentFlyoutProperties: jest.fn().mockReturnValue({}),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HookOptions = Parameters<typeof usePaginatedFlyout>[0];

const TEST_HISTORY_KEY = Symbol('test-key');

const makeOptions = (overrides?: Partial<HookOptions>): HookOptions => ({
  resolveDocument: jest.fn().mockReturnValue(null),
  renderBody: jest.fn().mockReturnValue(null),
  historyKey: TEST_HISTORY_KEY,
  origin: FLYOUT_ORIGIN.ALERTS_TABLE,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePaginatedFlyout', () => {
  const close = jest.fn();
  const openFlyout = jest.fn().mockReturnValue({ close });

  beforeEach(() => {
    __resetFlyoutPaginationStoreForTests();
    jest.clearAllMocks();
    jest.mocked(useOpenFlyout).mockReturnValue(openFlyout);
  });

  it('paginationInstanceId is stable across re-renders', () => {
    const { result, rerender } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const first = result.current.paginationInstanceId;
    rerender();
    expect(result.current.paginationInstanceId).toBe(first);
  });

  it('setState writes to the slice', () => {
    const { result } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const id = result.current.paginationInstanceId;

    act(() => {
      result.current.setState({ flyoutDocumentIndex: 5, totalDocumentCount: 50 });
    });

    expect(flyoutPaginationStore.getSlice(id).flyoutDocumentIndex).toBe(5);
    expect(flyoutPaginationStore.getSlice(id).totalDocumentCount).toBe(50);
  });

  it('closePaginatedFlyout soft-resets displayed-document fields and preserves openDocumentFlyoutImpl', () => {
    const { result } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const id = result.current.paginationInstanceId;

    act(() => {
      result.current.setState({ flyoutDocumentIndex: 3, totalDocumentCount: 10 });
    });

    act(() => {
      result.current.closePaginatedFlyout();
    });

    const slice = flyoutPaginationStore.getSlice(id);
    // Slice still exists — NOT absentSlice
    expect(slice).not.toBe(absentSlice);
    // Document-state fields are cleared
    expect(slice.flyoutDocumentIndex).toBeNull();
    expect(slice.flyoutDocument).toBeNull();
    expect(slice.isFlyoutDocumentLoading).toBe(false);
    // totalDocumentCount is source-level state, not a displayed-document field,
    // so it survives the soft-reset (see SOFT_RESET's comment).
    expect(slice.totalDocumentCount).toBe(10);
    // openDocumentFlyoutImpl is still registered (set by the useEffect)
    expect(slice.openDocumentFlyoutImpl).not.toBeNull();
  });

  it('openDocumentFlyoutImpl survives an open → close → open cycle (regression)', () => {
    const { result } = renderHook(() => usePaginatedFlyout(makeOptions()));

    // First open
    act(() => {
      result.current.openPaginatedFlyout(0);
    });
    expect(openFlyout).toHaveBeenCalledTimes(1);

    // Close
    act(() => {
      result.current.closePaginatedFlyout();
    });

    // Second open — openDocumentFlyoutImpl must still be registered so the
    // in-flyout EuiPagination can dispatch back through openPaginatedFlyout
    act(() => {
      result.current.openPaginatedFlyout(1);
    });
    expect(openFlyout).toHaveBeenCalledTimes(2);

    // And a third cycle for good measure
    act(() => {
      result.current.closePaginatedFlyout();
    });
    act(() => {
      result.current.openPaginatedFlyout(2);
    });
    expect(openFlyout).toHaveBeenCalledTimes(3);
  });

  it('registers openDocumentFlyoutImpl after mount', () => {
    const { result } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const id = result.current.paginationInstanceId;
    expect(flyoutPaginationStore.getSlice(id).openDocumentFlyoutImpl).not.toBeNull();
  });

  it('removes slice on unmount so getSlice returns absentSlice', () => {
    const { result, unmount } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const id = result.current.paginationInstanceId;

    act(() => {
      result.current.setState({ flyoutDocumentIndex: 2 });
    });

    unmount();

    expect(flyoutPaginationStore.getSlice(id)).toBe(absentSlice);
  });

  it('two concurrent hook instances have isolated slices', () => {
    const { result: r1 } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const { result: r2 } = renderHook(() => usePaginatedFlyout(makeOptions()));
    const id1 = r1.current.paginationInstanceId;
    const id2 = r2.current.paginationInstanceId;

    act(() => {
      r1.current.setState({ flyoutDocumentIndex: 5, totalDocumentCount: 50 });
    });

    expect(flyoutPaginationStore.getSlice(id1).flyoutDocumentIndex).toBe(5);
    expect(flyoutPaginationStore.getSlice(id2).flyoutDocumentIndex).toBeNull();
  });

  it('openPaginatedFlyout calls resolveDocument and sets flyoutDocumentIndex', () => {
    const resolveDocument = jest.fn().mockReturnValue(null);
    const { result } = renderHook(() => usePaginatedFlyout(makeOptions({ resolveDocument })));
    const id = result.current.paginationInstanceId;

    act(() => {
      result.current.openPaginatedFlyout(5);
    });

    expect(resolveDocument).toHaveBeenCalled();
    expect(flyoutPaginationStore.getSlice(id).flyoutDocumentIndex).toBe(5);
  });

  describe('system flyout lifecycle', () => {
    it('opens one instrumented V2 flyout on repeated pagination requests', () => {
      const { result } = renderHook(() => usePaginatedFlyout(makeOptions()));

      act(() => {
        result.current.openPaginatedFlyout(0);
        result.current.openPaginatedFlyout(1);
      });

      expect(openFlyout).toHaveBeenCalledTimes(1);
      expect(openFlyout).toHaveBeenCalledWith(
        null,
        expect.objectContaining({
          historyKey: TEST_HISTORY_KEY,
          session: FLYOUT_SESSION_KIND.START,
        }),
        {
          surface: FLYOUT_SURFACE.FLYOUT,
          flyoutType: FLYOUT_TYPE.DOCUMENT,
          session: FLYOUT_SESSION_KIND.START,
          origin: FLYOUT_ORIGIN.ALERTS_TABLE,
        }
      );
    });

    it('closePaginatedFlyout closes the V2 overlay', () => {
      const { result } = renderHook(() => usePaginatedFlyout(makeOptions()));

      act(() => {
        result.current.openPaginatedFlyout(0);
      });

      act(() => {
        result.current.closePaginatedFlyout();
      });

      expect(close).toHaveBeenCalled();
    });
  });
});
