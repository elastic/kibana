/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';

import type { EventsServiceStartContract } from '@kbn/agent-builder-browser/events';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { RoundCompleteEventData } from '@kbn/agent-builder-common/chat/events';

import { useRoundComplete } from '.';

vi.mock('@kbn/agent-builder-common', () => {
  const mocked = {
    isRoundCompleteEvent: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockIsRoundCompleteEvent = isRoundCompleteEvent as unknown as Mock;

describe('useRoundComplete', () => {
  let chatSubject$: Subject<unknown>;
  let eventsService: EventsServiceStartContract;

  beforeEach(() => {
    vi.clearAllMocks();

    chatSubject$ = new Subject<unknown>();

    eventsService = {
      chat$: chatSubject$.asObservable(),
    } as unknown as EventsServiceStartContract;
  });

  it('calls onRoundComplete when a round_complete event is emitted', () => {
    const onRoundComplete = vi.fn();
    const mockData = { round: { id: 'round-1' } } as unknown as RoundCompleteEventData;

    mockIsRoundCompleteEvent.mockReturnValue(true);

    renderHook(() => useRoundComplete({ eventsService, onRoundComplete }));

    act(() => {
      chatSubject$.next({ data: mockData, type: 'round_complete' });
    });

    expect(onRoundComplete).toHaveBeenCalledTimes(1);
    expect(onRoundComplete).toHaveBeenCalledWith(mockData);
  });

  it('does not call onRoundComplete for non-round-complete events', () => {
    const onRoundComplete = vi.fn();

    mockIsRoundCompleteEvent.mockReturnValue(false);

    renderHook(() => useRoundComplete({ eventsService, onRoundComplete }));

    act(() => {
      chatSubject$.next({ data: { content: 'hello' }, type: 'message_chunk' });
    });

    expect(onRoundComplete).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const onRoundComplete = vi.fn();
    const mockData = { round: { id: 'round-1' } } as unknown as RoundCompleteEventData;

    mockIsRoundCompleteEvent.mockReturnValue(true);

    const { unmount } = renderHook(() => useRoundComplete({ eventsService, onRoundComplete }));

    unmount();

    act(() => {
      chatSubject$.next({ data: mockData, type: 'round_complete' });
    });

    expect(onRoundComplete).not.toHaveBeenCalled();
  });

  it('handles undefined eventsService gracefully', () => {
    const onRoundComplete = vi.fn();

    expect(() => {
      renderHook(() => useRoundComplete({ eventsService: undefined, onRoundComplete }));
    }).not.toThrow();

    expect(onRoundComplete).not.toHaveBeenCalled();
  });

  it('calls onRoundComplete for each round in a multi-event stream', () => {
    const onRoundComplete = vi.fn();
    const mockData1 = { round: { id: 'round-1' } } as unknown as RoundCompleteEventData;
    const mockData2 = { round: { id: 'round-2' } } as unknown as RoundCompleteEventData;

    mockIsRoundCompleteEvent.mockReturnValue(true);

    renderHook(() => useRoundComplete({ eventsService, onRoundComplete }));

    act(() => {
      chatSubject$.next({ data: mockData1, type: 'round_complete' });
      chatSubject$.next({ data: mockData2, type: 'round_complete' });
    });

    expect(onRoundComplete).toHaveBeenCalledTimes(2);
    expect(onRoundComplete).toHaveBeenNthCalledWith(1, mockData1);
    expect(onRoundComplete).toHaveBeenNthCalledWith(2, mockData2);
  });

  it('uses the latest onRoundComplete callback without re-subscribing', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const mockData = { round: { id: 'round-1' } } as unknown as RoundCompleteEventData;

    mockIsRoundCompleteEvent.mockReturnValue(true);

    const { rerender } = renderHook(
      ({ onRoundComplete }) => useRoundComplete({ eventsService, onRoundComplete }),
      { initialProps: { onRoundComplete: firstCallback } }
    );

    rerender({ onRoundComplete: secondCallback });

    act(() => {
      chatSubject$.next({ data: mockData, type: 'round_complete' });
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledWith(mockData);
  });
});
