/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useEntityPanelTabs, OVERVIEW_TAB_ID, TABLE_TAB_ID } from './use_entity_panel_tabs';
import { mockEntityRecord } from '../../mocks';

describe('useEntityPanelTabs', () => {
  it('returns null tabs when entity is not in the store', () => {
    const { result } = renderHook(() => useEntityPanelTabs({ entityRecord: null }));

    expect(result.current.tabs).toBeNull();
    expect(result.current.selectedTabId).toBe(OVERVIEW_TAB_ID);
  });

  it('returns two tabs when entity is in the store', () => {
    const { result } = renderHook(() => useEntityPanelTabs({ entityRecord: mockEntityRecord }));

    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.tabs![0].id).toBe(OVERVIEW_TAB_ID);
    expect(result.current.tabs![1].id).toBe(TABLE_TAB_ID);
  });

  it('defaults to overview tab', () => {
    const { result } = renderHook(() => useEntityPanelTabs({ entityRecord: mockEntityRecord }));

    expect(result.current.selectedTabId).toBe(OVERVIEW_TAB_ID);
  });

  it('allows changing the selected tab', () => {
    const { result } = renderHook(() => useEntityPanelTabs({ entityRecord: mockEntityRecord }));

    act(() => {
      result.current.setSelectedTabId(TABLE_TAB_ID);
    });

    expect(result.current.selectedTabId).toBe(TABLE_TAB_ID);
  });
});
