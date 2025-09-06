/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import * as d3 from 'd3';
import { useMetricAnimation } from './use_metric_animation';

// Mock D3
jest.mock('d3', () => ({
  select: jest.fn(),
  interpolateNumber: jest.fn(),
}));

// Mock getComputedStyle
const mockGetComputedStyle = jest.fn();
Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle,
});

// Mock MutationObserver
const mockMutationObserver = jest.fn();
Object.defineProperty(window, 'MutationObserver', {
  value: mockMutationObserver,
});

describe('useMetricAnimation', () => {
  let mockElement: HTMLElement;
  let mockObserver: {
    observe: jest.Mock;
    disconnect: jest.Mock;
  };
  let mockD3Selection: {
    transition: jest.Mock;
    text: jest.Mock;
    interrupt: jest.Mock;
  };
  let mockTransition: {
    duration: jest.Mock;
    tween: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup mock element
    mockElement = document.createElement('div');
    mockElement.textContent = '$99,630';
    mockElement.className = 'echMetricText__value';
    mockElement.style.fontSize = '16px';
    mockElement.style.fontWeight = '700';
    mockElement.style.color = 'rgb(0, 138, 94)';

    // Setup mock observer
    mockObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
    };
    mockMutationObserver.mockImplementation(() => mockObserver);

    // Setup mock D3 selection
    mockD3Selection = {
      transition: jest.fn(),
      text: jest.fn(),
      interrupt: jest.fn(),
    };

    // Setup mock transition
    mockTransition = {
      duration: jest.fn().mockReturnThis(),
      tween: jest.fn().mockReturnThis(),
    };

    mockD3Selection.transition.mockReturnValue(mockTransition);
    (d3.select as jest.Mock).mockReturnValue(mockD3Selection);
    (d3.interpolateNumber as jest.Mock).mockReturnValue((t: number) => t * 99630);

    // Setup mock getComputedStyle
    mockGetComputedStyle.mockReturnValue({
      fontSize: '16px',
      fontWeight: '700',
      color: 'rgb(0, 138, 94)',
      textAlign: 'left',
      lineHeight: '19.2px',
      fontFamily: 'Inter, sans-serif',
    });

    // Add element to document
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }
    jest.useRealTimers();
  });

  it('should not start animation when element is not found', () => {
    // Remove the element from document so it's not found
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Should not start animation since element is not found
    expect(d3.select).not.toHaveBeenCalled();
  });

  it('should start animation immediately when element is found', () => {
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Since element is already in document, animation should start after delay
    expect(d3.select).toHaveBeenCalledWith(mockElement);
    expect(mockTransition.tween).toHaveBeenCalledWith('text', expect.any(Function));
  });

  it('should set up mutation observer when element is not initially found', () => {
    // Remove element from document initially
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    expect(mockMutationObserver).toHaveBeenCalled();
    expect(mockObserver.observe).toHaveBeenCalledWith(document.body, {
      childList: true,
      subtree: true,
    });
  });

  it('should extract numeric value from text content', () => {
    mockElement.textContent = '$1,234,567.89';

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockTransition.tween).toHaveBeenCalledWith('text', expect.any(Function));
  });

  it('should handle non-numeric text gracefully', () => {
    mockElement.textContent = 'Not a number';

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    expect(d3.select).not.toHaveBeenCalled();
  });

  it('should start animation with correct initial values', () => {
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockElement.textContent).toBe('$0');
    expect(mockTransition.duration).toHaveBeenCalledWith(2000);
    expect(mockTransition.tween).toHaveBeenCalledWith('text', expect.any(Function));
  });

  it('should restore original text after animation', () => {
    const originalText = mockElement.textContent;

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Fast-forward past the 100ms delay + animation duration
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(mockElement.textContent).toBe(originalText);
  });

  it('should use fallback timeout when element is not found by observer', () => {
    // Remove element from document initially
    if (document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Add the element back to the document after the hook is initialized
    document.body.appendChild(mockElement);

    // Fast-forward past the fallback timeout
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(d3.select).toHaveBeenCalledWith(mockElement);
  });

  it('should clean up observer and animation on unmount', () => {
    // Remove element from document initially to ensure observer is created
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

  it('should handle different selectors', () => {
    mockElement.className = 'custom-metric-value';

    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.custom-metric-value',
      })
    );

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(d3.select).toHaveBeenCalledWith(mockElement);
  });

  it('should prevent multiple animations on the same element', () => {
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    const firstCallCount = (d3.select as jest.Mock).mock.calls.length;

    // Try to render the hook again - should not start a second animation
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Should not start a second animation
    expect((d3.select as jest.Mock).mock.calls.length).toBe(firstCallCount);
  });

  it('should handle animation duration parameter', () => {
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 5000,
        selector: '.echMetricText__value',
      })
    );

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(mockTransition.duration).toHaveBeenCalledWith(5000);
  });

  it('should format animated values with currency and commas', () => {
    renderHook(() =>
      useMetricAnimation({
        animationDurationMs: 2000,
        selector: '.echMetricText__value',
      })
    );

    // Fast-forward past the 100ms delay
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Get the tween function
    const tweenFunction = mockTransition.tween.mock.calls[0][1];

    // Test the tween function
    act(() => {
      tweenFunction(0.5); // 50% through animation
    });

    // Should format the number with currency and commas
    expect(mockElement.textContent).toMatch(/^\$\d{1,3}(,\d{3})*$/);
  });
});
