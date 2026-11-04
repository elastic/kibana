/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useEventsSelection } from './use_events_selection';

const checkboxEvent = (checked: boolean) =>
  ({ target: { checked } } as ChangeEvent<HTMLInputElement>);

describe('useEventsSelection', () => {
  const pageIds = ['event-1', 'event-2'];

  it('selects and unselects rows', () => {
    const { result } = renderHook(() => useEventsSelection({ pageIds, onRemove: jest.fn() }));

    act(() => result.current.onRowSelected({ eventIds: ['event-1'], isSelected: true }));
    expect([...result.current.selectedIds]).toEqual(['event-1']);
    expect(result.current.selectedEventIds).toEqual({ 'event-1': [] });
    expect(result.current.isPageSelected).toBe(false);

    act(() => result.current.onRowSelected({ eventIds: ['event-1'], isSelected: false }));
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('selects and clears every row on the page', () => {
    const { result } = renderHook(() => useEventsSelection({ pageIds, onRemove: jest.fn() }));

    act(() => result.current.onSelectPage(checkboxEvent(true)));
    expect([...result.current.selectedIds]).toEqual(pageIds);
    expect(result.current.isPageSelected).toBe(true);

    act(() => result.current.onSelectPage(checkboxEvent(false)));
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('forgets selected rows that leave the page', () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useEventsSelection>[0]) => useEventsSelection(props),
      { initialProps: { pageIds, onRemove: jest.fn() } }
    );

    act(() => result.current.onSelectPage(checkboxEvent(true)));
    rerender({ pageIds: ['event-2'], onRemove: jest.fn() });

    expect([...result.current.selectedIds]).toEqual(['event-2']);
  });

  it('removes the selected events and clears the selection on success', () => {
    const onRemove = jest.fn();
    const { result } = renderHook(() => useEventsSelection({ pageIds, onRemove }));

    act(() => result.current.onSelectPage(checkboxEvent(true)));
    act(() => result.current.onRemoveSelected());

    expect(onRemove).toHaveBeenCalledWith(
      { attachmentIds: pageIds },
      { onSuccess: expect.any(Function) }
    );

    act(() => onRemove.mock.calls[0][1].onSuccess());
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('removes 1 event with a callback that is stable across renders', () => {
    const onRemove = jest.fn();
    const { result, rerender } = renderHook(() => useEventsSelection({ pageIds, onRemove }));
    const { onRemoveEvent } = result.current;

    rerender();
    expect(result.current.onRemoveEvent).toBe(onRemoveEvent);

    act(() => result.current.onRemoveEvent?.('event-2'));
    expect(onRemove).toHaveBeenCalledWith({ attachmentIds: ['event-2'] });
  });

  it('does not offer removal without onRemove', () => {
    const { result } = renderHook(() => useEventsSelection({ pageIds }));

    expect(result.current.onRemoveEvent).toBeUndefined();
  });
});
