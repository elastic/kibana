/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useAbortControllerRef } from '.';

describe('useAbortControllerRef', () => {
  describe('when the hook is rendered', () => {
    it('should return a ref object with an AbortController instance', () => {
      const { result } = renderHook(() => useAbortControllerRef());

      expect(result.current.current).not.toBeNull();
      expect(result.current.current).toBeInstanceOf(AbortController);
    });
  });

  describe('when the hook is rerendered', () => {
    it('should return the same instance of AbortController', () => {
      const { result, rerender } = renderHook(() => useAbortControllerRef());

      const initialController = result.current.current;

      rerender();

      expect(result.current.current).toBe(initialController);
    });
  });

  describe('when the hook is re-mounted', () => {
    it('should return a new instance of AbortController', () => {
      const { result, rerender } = renderHook(() => useAbortControllerRef());

      const initialController = result.current.current;

      rerender();

      expect(result.current.current).toBe(initialController);

      rerender();

      expect(result.current.current).toBe(initialController);
    });
  });

  describe('when the hook is unmounted', () => {
    it('should abort the controller', () => {
      const { result, unmount } = renderHook(() => useAbortControllerRef());

      const controller = result.current.current;

      expect(controller.signal.aborted).toBe(false);

      unmount();

      expect(controller.signal.aborted).toBe(true);
    });

    describe('and ref was updated', () => {
      it('should abort the updated controller', () => {
        const { result, unmount } = renderHook(() => useAbortControllerRef());

        const controller = result.current.current;

        expect(controller.signal.aborted).toBe(false);

        const newController = new AbortController();
        result.current.current = newController;

        unmount();

        expect(newController.signal.aborted).toBe(true);
      });
    });
  });
});
