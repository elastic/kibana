/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useFlyoutPagination } from './use_flyout_pagination';
import { __resetFlyoutPaginationStoreForTests, flyoutPaginationStore } from './store';
import { absentSlice } from './types';

const sampleDocument = {
  id: 'index-1::alert-1',
  raw: { _id: 'alert-1', _index: 'index-1' },
} as unknown as DataTableRecord;

const INSTANCE_A = 'instance-a';
const INSTANCE_B = 'instance-b';

describe('useFlyoutPagination', () => {
  beforeEach(() => {
    __resetFlyoutPaginationStoreForTests();
  });

  describe('with null / undefined instanceId', () => {
    it('returns the absent slice so consumers render no pagination', () => {
      const { result } = renderHook(() => useFlyoutPagination(null));

      expect(result.current.flyoutDocumentIndex).toBeNull();
      expect(result.current.pageSize).toBe(0);
      expect(result.current.totalDocumentCount).toBe(0);
      expect(result.current.isFlyoutDocumentLoading).toBe(false);
      expect(result.current.flyoutDocument).toBeNull();
    });

    it('does not throw when openDocumentFlyout is called with a null instanceId', () => {
      const { result } = renderHook(() => useFlyoutPagination(null));
      expect(() => result.current.openDocumentFlyout(3)).not.toThrow();
    });

    it('returns the absent slice for an unknown instanceId', () => {
      const { result } = renderHook(() => useFlyoutPagination('no-such-id'));
      expect(result.current.flyoutDocumentIndex).toBeNull();
      expect(result.current.totalDocumentCount).toBe(0);
    });
  });

  describe('with a known instanceId', () => {
    it('reflects updates written to the store', () => {
      const { result } = renderHook(() => useFlyoutPagination(INSTANCE_A));

      expect(result.current.flyoutDocumentIndex).toBeNull();

      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, {
          flyoutDocumentIndex: 42,
          totalDocumentCount: 500,
          pageSize: 50,
          flyoutDocument: sampleDocument,
        });
      });

      expect(result.current.flyoutDocumentIndex).toBe(42);
      expect(result.current.totalDocumentCount).toBe(500);
      expect(result.current.pageSize).toBe(50);
      expect(result.current.flyoutDocument).toBe(sampleDocument);
    });

    it('forwards openDocumentFlyout to the registered openDocumentFlyoutImpl', () => {
      const impl = jest.fn();

      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, { openDocumentFlyoutImpl: impl });
      });

      const { result } = renderHook(() => useFlyoutPagination(INSTANCE_A));

      result.current.openDocumentFlyout(7);

      expect(impl).toHaveBeenCalledTimes(1);
      expect(impl).toHaveBeenCalledWith(7);
    });

    it('treats openDocumentFlyout as a no-op if no impl is registered', () => {
      const { result } = renderHook(() => useFlyoutPagination(INSTANCE_A));
      expect(() => result.current.openDocumentFlyout(0)).not.toThrow();
    });

    it('returns to absent slice after the slice is removed', () => {
      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, {
          flyoutDocumentIndex: 10,
          totalDocumentCount: 100,
        });
      });

      const { result } = renderHook(() => useFlyoutPagination(INSTANCE_A));
      expect(result.current.flyoutDocumentIndex).toBe(10);

      act(() => {
        flyoutPaginationStore.removeSlice(INSTANCE_A);
      });

      expect(result.current.flyoutDocumentIndex).toBeNull();
      expect(result.current.totalDocumentCount).toBe(0);
    });
  });

  describe('slice isolation', () => {
    it('two slices coexist independently — instance A updates do not affect instance B', () => {
      const { result: resultA } = renderHook(() => useFlyoutPagination(INSTANCE_A));
      const { result: resultB } = renderHook(() => useFlyoutPagination(INSTANCE_B));

      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, {
          flyoutDocumentIndex: 5,
          totalDocumentCount: 50,
        });
        flyoutPaginationStore.setSlice(INSTANCE_B, {
          flyoutDocumentIndex: 99,
          totalDocumentCount: 200,
        });
      });

      expect(resultA.current.flyoutDocumentIndex).toBe(5);
      expect(resultA.current.totalDocumentCount).toBe(50);
      expect(resultB.current.flyoutDocumentIndex).toBe(99);
      expect(resultB.current.totalDocumentCount).toBe(200);
    });

    it("removing instance A's slice does not affect instance B", () => {
      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, {
          flyoutDocumentIndex: 3,
          totalDocumentCount: 30,
        });
        flyoutPaginationStore.setSlice(INSTANCE_B, {
          flyoutDocumentIndex: 77,
          totalDocumentCount: 770,
        });
      });

      const { result: resultA } = renderHook(() => useFlyoutPagination(INSTANCE_A));
      const { result: resultB } = renderHook(() => useFlyoutPagination(INSTANCE_B));

      act(() => {
        flyoutPaginationStore.removeSlice(INSTANCE_A);
      });

      expect(resultA.current).toMatchObject(absentSlice);
      expect(resultB.current.flyoutDocumentIndex).toBe(77);
      expect(resultB.current.totalDocumentCount).toBe(770);
    });

    it("removing instance B's slice does not affect instance A", () => {
      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, {
          flyoutDocumentIndex: 10,
          totalDocumentCount: 100,
        });
        flyoutPaginationStore.setSlice(INSTANCE_B, {
          flyoutDocumentIndex: 20,
          totalDocumentCount: 200,
        });
      });

      const { result: resultA } = renderHook(() => useFlyoutPagination(INSTANCE_A));
      const { result: resultB } = renderHook(() => useFlyoutPagination(INSTANCE_B));

      act(() => {
        flyoutPaginationStore.removeSlice(INSTANCE_B);
      });

      expect(resultA.current.flyoutDocumentIndex).toBe(10);
      expect(resultA.current.totalDocumentCount).toBe(100);
      expect(resultB.current).toMatchObject(absentSlice);
    });
  });

  describe('cross-tree state sharing', () => {
    it('two independent hook instances for the same id stay in sync via the store', () => {
      const { result: hookA } = renderHook(() => useFlyoutPagination(INSTANCE_A));
      const { result: hookB } = renderHook(() => useFlyoutPagination(INSTANCE_A));

      act(() => {
        flyoutPaginationStore.setSlice(INSTANCE_A, {
          flyoutDocumentIndex: 42,
          flyoutDocument: sampleDocument,
        });
      });

      expect(hookA.current.flyoutDocumentIndex).toBe(42);
      expect(hookA.current.flyoutDocument).toBe(sampleDocument);
      expect(hookB.current.flyoutDocumentIndex).toBe(42);
      expect(hookB.current.flyoutDocument).toBe(sampleDocument);
    });
  });
});
