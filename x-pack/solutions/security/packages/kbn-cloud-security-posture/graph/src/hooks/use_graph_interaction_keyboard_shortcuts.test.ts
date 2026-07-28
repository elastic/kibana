/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useGraphInteractionKeyboardShortcuts } from './use_graph_interaction_keyboard_shortcuts';

describe('useGraphInteractionKeyboardShortcuts', () => {
  it('invokes callbacks for search and display shortcuts', () => {
    const onToggleApplyFiltersPanel = jest.fn();
    const onToggleSearchPanel = jest.fn();
    const onFocusSearchInput = jest.fn();

    renderHook(() =>
      useGraphInteractionKeyboardShortcuts({
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

    expect(onToggleSearchPanel).toHaveBeenCalledTimes(1);
    expect(onToggleApplyFiltersPanel).toHaveBeenCalledTimes(1);
    expect(onFocusSearchInput).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts while typing in an input', () => {
    const onToggleSearchPanel = jest.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() =>
      useGraphInteractionKeyboardShortcuts({
        onToggleApplyFiltersPanel: jest.fn(),
        onToggleSearchPanel,
      })
    );

    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true }));

    expect(onToggleSearchPanel).not.toHaveBeenCalled();

    input.remove();
  });
});
