/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { type AttackDetailsSnapshot, useAttackDetailsSubscription } from './attack_details_cache';

const INDEX = '.alerts-default';

const buildSnapshot = (
  overrides: Partial<AttackDetailsSnapshot> = {}
): AttackDetailsSnapshot => ({
  loading: false,
  dataFormattedForFieldBrowser: [],
  searchHit: undefined,
  refetch: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('useAttackDetailsSubscription', () => {
  describe('primary election', () => {
    it('marks the first subscriber for a key as primary', () => {
      const { result } = renderHook(() => useAttackDetailsSubscription(INDEX, 'a'));

      expect(result.current.isPrimary).toBe(true);
      expect(result.current.cachedSnapshot).toBeNull();
    });

    it('marks subsequent subscribers for the same key as secondary', () => {
      renderHook(() => useAttackDetailsSubscription(INDEX, 'b'));
      const second = renderHook(() => useAttackDetailsSubscription(INDEX, 'b'));

      expect(second.result.current.isPrimary).toBe(false);
    });

    it('does not deduplicate across different attack ids', () => {
      const first = renderHook(() => useAttackDetailsSubscription(INDEX, 'c1'));
      const second = renderHook(() => useAttackDetailsSubscription(INDEX, 'c2'));

      expect(first.result.current.isPrimary).toBe(true);
      expect(second.result.current.isPrimary).toBe(true);
    });

    it('does not deduplicate across different indices for the same attack id', () => {
      const first = renderHook(() => useAttackDetailsSubscription('.alerts-a', 'c'));
      const second = renderHook(() => useAttackDetailsSubscription('.alerts-b', 'c'));

      expect(first.result.current.isPrimary).toBe(true);
      expect(second.result.current.isPrimary).toBe(true);
    });

    it('opts out of dedup when attackId is empty and treats each caller as its own primary', () => {
      const first = renderHook(() => useAttackDetailsSubscription(INDEX, ''));
      const second = renderHook(() => useAttackDetailsSubscription(INDEX, ''));

      expect(first.result.current.isPrimary).toBe(true);
      expect(second.result.current.isPrimary).toBe(true);
    });

    it('opts out of dedup when indexName is empty', () => {
      const { result } = renderHook(() => useAttackDetailsSubscription('', 'd'));

      expect(result.current.isPrimary).toBe(true);
    });
  });

  describe('primary handoff and cleanup', () => {
    it('hands off primary to the next subscriber when the primary unmounts', () => {
      const primary = renderHook(() => useAttackDetailsSubscription(INDEX, 'e'));
      const secondary = renderHook(() => useAttackDetailsSubscription(INDEX, 'e'));
      expect(secondary.result.current.isPrimary).toBe(false);

      primary.unmount();

      expect(secondary.result.current.isPrimary).toBe(true);
    });

    it('frees the cache entry when the last subscriber unmounts so the next mount becomes primary again', () => {
      const first = renderHook(() => useAttackDetailsSubscription(INDEX, 'f'));
      first.unmount();

      const fresh = renderHook(() => useAttackDetailsSubscription(INDEX, 'f'));

      expect(fresh.result.current.isPrimary).toBe(true);
    });

    it('frees the cache entry after every subscriber for a key has unmounted', () => {
      const primary = renderHook(() => useAttackDetailsSubscription(INDEX, 'g'));
      const secondary = renderHook(() => useAttackDetailsSubscription(INDEX, 'g'));

      primary.unmount();
      secondary.unmount();

      const fresh = renderHook(() => useAttackDetailsSubscription(INDEX, 'g'));

      expect(fresh.result.current.isPrimary).toBe(true);
    });
  });

  describe('snapshot publish', () => {
    it('exposes the primary-published snapshot to secondary subscribers', () => {
      const primary = renderHook(() => useAttackDetailsSubscription(INDEX, 'h'));
      const secondary = renderHook(() => useAttackDetailsSubscription(INDEX, 'h'));
      const snapshot = buildSnapshot({ loading: true });

      act(() => {
        primary.result.current.publishSnapshot(snapshot);
      });

      expect(secondary.result.current.cachedSnapshot).toEqual(snapshot);
    });

    it('does not expose the cached snapshot to the primary itself', () => {
      const primary = renderHook(() => useAttackDetailsSubscription(INDEX, 'i'));

      act(() => {
        primary.result.current.publishSnapshot(buildSnapshot({ loading: true }));
      });

      expect(primary.result.current.cachedSnapshot).toBeNull();
    });

    it('ignores publishes from a non-primary subscriber', () => {
      renderHook(() => useAttackDetailsSubscription(INDEX, 'j'));
      const secondary = renderHook(() => useAttackDetailsSubscription(INDEX, 'j'));
      const stale = buildSnapshot({ loading: true });

      act(() => {
        secondary.result.current.publishSnapshot(stale);
      });

      expect(secondary.result.current.cachedSnapshot).toBeNull();
    });
  });

  describe('cacheKey transitions on the same hook instance', () => {
    it('releases the old key on attackId change so a new mount can claim it', () => {
      const { rerender } = renderHook(
        ({ attackId }: { attackId: string }) => useAttackDetailsSubscription(INDEX, attackId),
        { initialProps: { attackId: 'k-old' } }
      );

      rerender({ attackId: 'k-new' });

      const fresh = renderHook(() => useAttackDetailsSubscription(INDEX, 'k-old'));
      expect(fresh.result.current.isPrimary).toBe(true);
    });

    it('becomes primary for a fresh key when transitioning from an opted-out state', () => {
      const { result, rerender } = renderHook(
        ({ attackId }: { attackId: string }) => useAttackDetailsSubscription(INDEX, attackId),
        { initialProps: { attackId: '' } }
      );

      rerender({ attackId: 'k-fresh' });

      expect(result.current.isPrimary).toBe(true);
    });
  });
});
