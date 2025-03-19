/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useIsLoadingComplete } from './use_is_loading_complete';

describe('useIsLoadingComplete', () => {
  describe('initialization', () => {
    it('should initialize with undefined', () => {
      const { result } = renderHook(() => useIsLoadingComplete({ loadingStates: [false, false] }));
      expect(result.current).toBeUndefined();
    });

    it('should handle an empty array of loadingStates', () => {
      const { result } = renderHook(() => useIsLoadingComplete({ loadingStates: [] }));
      expect(result.current).toBeUndefined();
    });

    it('should handle a single loading state that is false', () => {
      const { result } = renderHook(() => useIsLoadingComplete({ loadingStates: [false] }));
      expect(result.current).toBeUndefined();
    });
  });

  describe('loading states', () => {
    it('should set isLoadingComplete to false when some loadingStates are true', () => {
      const { result } = renderHook(() => useIsLoadingComplete({ loadingStates: [true, false] }));
      expect(result.current).toBe(false);
    });

    it('should set isLoadingComplete to false when all loadingStates are true', () => {
      const { result } = renderHook(() => useIsLoadingComplete({ loadingStates: [true, true] }));
      expect(result.current).toBe(false);
    });

    it('should handle a single loading state that is true', () => {
      const { result } = renderHook(() => useIsLoadingComplete({ loadingStates: [true] }));
      expect(result.current).toBe(false);
    });
  });

  describe('loading completion', () => {
    it('should set isLoadingComplete to true when all loadingStates are false after being true', () => {
      const { result, rerender } = renderHook(
        ({ loadingStates }) => useIsLoadingComplete({ loadingStates }),
        {
          initialProps: { loadingStates: [true, false] },
        }
      );

      expect(result.current).toBe(false);

      rerender({ loadingStates: [false, false] });

      expect(result.current).toBe(true);
    });

    it('should set isLoadingComplete to true when all loadingStates are false after being mixed', () => {
      const { result, rerender } = renderHook(
        ({ loadingStates }) => useIsLoadingComplete({ loadingStates }),
        {
          initialProps: { loadingStates: [true, false] },
        }
      );

      expect(result.current).toBe(false);

      rerender({ loadingStates: [false, false] });

      expect(result.current).toBe(true);
    });
  });

  describe('mixed states', () => {
    it('should not change isLoadingComplete if loadingStates are mixed', () => {
      const { result, rerender } = renderHook(
        ({ loadingStates }) => useIsLoadingComplete({ loadingStates }),
        {
          initialProps: { loadingStates: [true, true] },
        }
      );

      expect(result.current).toBe(false);

      rerender({ loadingStates: [true, false] });

      expect(result.current).toBe(false);
    });

    it('should not change isLoadingComplete if loadingStates change from all true to mixed', () => {
      const { result, rerender } = renderHook(
        ({ loadingStates }) => useIsLoadingComplete({ loadingStates }),
        {
          initialProps: { loadingStates: [true, true] },
        }
      );

      expect(result.current).toBe(false);

      rerender({ loadingStates: [true, false] });

      expect(result.current).toBe(false);
    });
  });
});
