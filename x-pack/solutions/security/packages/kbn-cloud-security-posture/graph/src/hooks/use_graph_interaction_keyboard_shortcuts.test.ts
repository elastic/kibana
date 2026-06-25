/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGraphInteractionKeyboardShortcuts } from './use_graph_interaction_keyboard_shortcuts';

describe('useGraphInteractionKeyboardShortcuts', () => {
  it('invokes callbacks for select, pan, search, and display shortcuts', () => {
    const onSelectTool = jest.fn();
    const onPanTool = jest.fn();
    const onToggleApplyFiltersPanel = jest.fn();
    const onToggleSearchPanel = jest.fn();
    const onFocusSearchInput = jest.fn();

    renderHook(() =>
      useGraphInteractionKeyboardShortcuts({
        onSelectTool,
        onPanTool,
        onToggleApplyFiltersPanel,
        onToggleSearchPanel,
        onFocusSearchInput,
      })
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV', key: 'v', bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyK', key: 'k', metaKey: true, bubbles: true })
    );

    expect(onSelectTool).toHaveBeenCalledTimes(1);
    expect(onPanTool).toHaveBeenCalledTimes(1);
    expect(onToggleSearchPanel).toHaveBeenCalledTimes(1);
    expect(onToggleApplyFiltersPanel).toHaveBeenCalledTimes(1);
    expect(onFocusSearchInput).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts while typing in an input', () => {
    const onSelectTool = jest.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useGraphInteractionKeyboardShortcuts({
        onSelectTool,
        onPanTool: jest.fn(),
        onToggleApplyFiltersPanel: jest.fn(),
      })
    );

    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV', bubbles: true }));

    expect(onSelectTool).not.toHaveBeenCalled();

    input.remove();
  });
});
