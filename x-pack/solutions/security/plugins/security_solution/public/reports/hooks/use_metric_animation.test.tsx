/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import * as d3 from 'd3';
import { useMetricAnimation } from './use_metric_animation';

vi.mock('d3', () => {
      const mocked = {
      select: vi.fn(),
      interpolateNumber: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockGetComputedStyle = vi.fn();
Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle,
});

const mockMutationObserver = vi.fn();
Object.defineProperty(window, 'MutationObserver', {
  value: mockMutationObserver,
});

describe('useMetricAnimation', () => {
  let mockElement: HTMLElement;
  let mockObserver: {
    observe: Mock;
    disconnect: Mock;
  };
  let mockD3Selection: {
    transition: Mock;
    text: Mock;
    interrupt: Mock;
  };
  let mockTransition: {
    duration: Mock;
    tween: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockElement = document.createElement('div');
    mockElement.textContent = '$99,630';
    mockElement.className = 'echMetricText__value';
    mockElement.style.fontSize = '16px';
    mockElement.style.fontWeight = '700';
    mockElement.style.color = 'rgb(0, 138, 94)';

    mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    mockMutationObserver.mockImplementation(() => mockObserver);

    mockD3Selection = {
      transition: vi.fn(),
      text: vi.fn(),
      interrupt: vi.fn(),
    };

    mockTransition = {
      duration: vi.fn().mockReturnThis(),
      tween: vi.fn().mockReturnThis(),
    };

    mockD3Selection.transition.mockReturnValue(mockTransition);
    (d3.select as Mock).mockReturnValue(mockD3Selection);
    (d3.interpolateNumber as Mock).mockReturnValue((t: number) => t * 99630);

    mockGetComputedStyle.mockReturnValue({
      fontSize: '16px',
      fontWeight: '700',
      color: 'rgb(0, 138, 94)',
      textAlign: 'left',
      lineHeight: '19.2px',
      fontFamily: 'Inter, sans-serif',
    });

    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }
    vi.useRealTimers();
  });

  it('handles element detection, animation start, and mutation observer setup correctly', () => {
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    expect(d3.select).not.toHaveBeenCalled();
    expect(mockMutationObserver).toHaveBeenCalled();
    expect(mockObserver.observe).toHaveBeenCalledWith(document.body, {
      childList: true,
      subtree: true,
    });

    document.body.appendChild(mockElement);
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(d3.select).toHaveBeenCalledWith(mockElement);
    expect(mockTransition.tween).toHaveBeenCalledWith('text', expect.any(Function));
  });

  it('handles text extraction, animation logic, and value formatting correctly', () => {
    mockElement.textContent = '$1,234,567.89';
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockTransition.tween).toHaveBeenCalledWith('text', expect.any(Function));

    mockElement.textContent = '$99,630';
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockElement.textContent).toBe('$0');
    expect(mockTransition.duration).toHaveBeenCalledWith(2000);
    expect(mockTransition.tween).toHaveBeenCalledWith('text', expect.any(Function));
  });

  it('handles animation completion, fallback timeout, cleanup, and edge cases correctly', () => {
    const originalText = mockElement.textContent;
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(mockElement.textContent).toBe(originalText);

    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    document.body.appendChild(mockElement);
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(d3.select).toHaveBeenCalledWith(mockElement);
  });

  it('handles cleanup on unmount correctly', () => {
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    const { unmount } = renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    unmount();
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });

  it('handles different selectors, prevents multiple animations, and formats values correctly', () => {
    mockElement.className = 'custom-metric-value';
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.custom-metric-value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(d3.select).toHaveBeenCalledWith(mockElement);

    mockElement.className = 'echMetricText__value';
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    const tweenFunction = mockTransition.tween.mock.calls[0][1];
    act(() => {
      tweenFunction(0.5);
    });

    expect(mockElement.textContent).toMatch(/^\$\d{1,3}(,\d{3})*$/);

    const firstCallCount = (d3.select as Mock).mock.calls.length;
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    expect((d3.select as Mock).mock.calls.length).toBe(firstCallCount);
  });

  it('handles animation duration parameter correctly', () => {
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 5000,
        selector: '.echMetricText__value',
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockTransition.duration).toHaveBeenCalledWith(5000);
  });
});
