/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useIsVisible } from '.';

describe('useVisibility', () => {
  let initialState: boolean;
  let onOpen: jest.Mock;
  let onClose: jest.Mock;
  let onToggle: jest.Mock;

  beforeEach(() => {
    initialState = false;
    onOpen = jest.fn();
    onClose = jest.fn();
    onToggle = jest.fn();
  });

  it('should initialize with the correct state', () => {
    const { result } = renderHook(() => useIsVisible(initialState));
    expect(result.current.isVisible).toBe(initialState);
  });

  it('should call onOpen when opening visibility', () => {
    const { result } = renderHook(() => useIsVisible(initialState, { onOpen }));
    act(() => {
      result.current.open();
    });
    expect(result.current.isVisible).toBe(true);
    expect(onOpen).toHaveBeenCalled();
  });

  it('should call onClose when closing visibility', () => {
    const { result } = renderHook(() => useIsVisible(true, { onClose }));
    act(() => {
      result.current.close();
    });
    expect(result.current.isVisible).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onToggle when toggling visibility', () => {
    const { result } = renderHook(() => useIsVisible(true, { onToggle }));
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(false);
    expect(onToggle).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isVisible).toBe(true);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});
