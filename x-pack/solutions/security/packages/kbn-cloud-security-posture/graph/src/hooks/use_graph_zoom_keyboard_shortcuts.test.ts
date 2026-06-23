/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGraphZoomKeyboardShortcuts } from './use_graph_zoom_keyboard_shortcuts';

describe('useGraphZoomKeyboardShortcuts', () => {
  it('invokes callbacks for zoom, fit to screen, full screen, and center shortcuts', () => {
    const onZoomIn = jest.fn();
    const onZoomOut = jest.fn();
    const onFitToScreen = jest.fn();
    const onToggleFullScreen = jest.fn();
    const onCenter = jest.fn();

    renderHook(() =>
      useGraphZoomKeyboardShortcuts({
        onZoomIn,
        onZoomOut,
        onFitToScreen,
        onToggleFullScreen,
        onCenter,
      })
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Equal', key: '=', bubbles: true })
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Equal', key: '+', shiftKey: true, bubbles: true })
    );
    document.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Minus', key: '-', bubbles: true })
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit0', key: '0', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c', bubbles: true }));

    expect(onZoomIn).toHaveBeenCalledTimes(2);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onFitToScreen).toHaveBeenCalledTimes(1);
    expect(onToggleFullScreen).toHaveBeenCalledTimes(1);
    expect(onCenter).toHaveBeenCalledTimes(1);
  });

  it('ignores full screen shortcut when toggle handler is not provided', () => {
    const onToggleFullScreen = jest.fn();

    renderHook(() =>
      useGraphZoomKeyboardShortcuts({
        onZoomIn: jest.fn(),
        onZoomOut: jest.fn(),
        onFitToScreen: jest.fn(),
      })
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));

    expect(onToggleFullScreen).not.toHaveBeenCalled();
  });

  it('ignores center shortcut when center handler is not provided', () => {
    const onCenter = jest.fn();

    renderHook(() =>
      useGraphZoomKeyboardShortcuts({
        onZoomIn: jest.fn(),
        onZoomOut: jest.fn(),
        onFitToScreen: jest.fn(),
      })
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyC', key: 'c', bubbles: true }));

    expect(onCenter).not.toHaveBeenCalled();
  });
});
