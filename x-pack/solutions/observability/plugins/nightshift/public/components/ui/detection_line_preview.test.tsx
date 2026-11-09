/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { DETECTION_LINE_STATIC_FRAME_S } from './detection_line_preview_render';
import { DetectionLinePreview } from './detection_line_preview';

const renderDetectionLineAt = jest.fn();

jest.mock('./detection_line_preview_render', () => {
  const actual = jest.requireActual('./detection_line_preview_render');
  return {
    ...actual,
    renderDetectionLineAt: (...args: unknown[]) => renderDetectionLineAt(...args),
  };
});

type MotionListener = (event: MediaQueryListEvent) => void;

function mockPrefersReducedMotion(matches: boolean): {
  setMatches: (next: boolean) => void;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
} {
  const listeners = new Set<MotionListener>();
  const mediaQuery = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: jest.fn((_type: string, listener: MotionListener) => {
      listeners.add(listener);
    }),
    removeEventListener: jest.fn((_type: string, listener: MotionListener) => {
      listeners.delete(listener);
    }),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };

  window.matchMedia = jest.fn().mockImplementation((query: string) => {
    if (query.includes('prefers-reduced-motion: reduce')) {
      return mediaQuery;
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });

  return {
    setMatches: (next: boolean) => {
      mediaQuery.matches = next;
      listeners.forEach((listener) => {
        listener({ matches: next } as MediaQueryListEvent);
      });
    },
    addEventListener: mediaQuery.addEventListener,
    removeEventListener: mediaQuery.removeEventListener,
  };
}

describe('DetectionLinePreview', () => {
  const originalMatchMedia = window.matchMedia;
  const originalRaf = window.requestAnimationFrame;
  const originalCaf = window.cancelAnimationFrame;
  const originalResizeObserver = window.ResizeObserver;
  let rafIds = 0;
  let pendingFrames = new Map<number, FrameRequestCallback>();
  let frameElapsedMs = 0;

  const flushNextFrame = () => {
    const entry = pendingFrames.entries().next().value as
      | [number, FrameRequestCallback]
      | undefined;
    if (!entry) {
      throw new Error('Expected a queued animation frame');
    }
    const [id, callback] = entry;
    pendingFrames.delete(id);
    frameElapsedMs += 16;
    const now = performance.now() + frameElapsedMs;
    act(() => {
      callback(now);
    });
  };

  beforeEach(() => {
    renderDetectionLineAt.mockClear();
    rafIds = 0;
    pendingFrames = new Map();
    frameElapsedMs = 0;

    window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      rafIds += 1;
      pendingFrames.set(rafIds, callback);
      return rafIds;
    });
    window.cancelAnimationFrame = jest.fn((id: number) => {
      pendingFrames.delete(id);
    });
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      setTransform: jest.fn(),
      clearRect: jest.fn(),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      clip: jest.fn(),
      drawImage: jest.fn(),
      arc: jest.fn(),
      setLineDash: jest.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 80,
        height: 80,
        top: 0,
        left: 0,
        bottom: 80,
        right: 80,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCaf;
    window.ResizeObserver = originalResizeObserver;
  });

  it('draws a static frame without scheduling animation when reduced motion is preferred', () => {
    const motion = mockPrefersReducedMotion(true);

    render(
      <EuiProvider>
        <div style={{ width: 80, height: 80 }}>
          <DetectionLinePreview />
        </div>
      </EuiProvider>
    );

    expect(renderDetectionLineAt).toHaveBeenCalledTimes(1);
    expect(renderDetectionLineAt.mock.calls[0]?.[5]).toBe(DETECTION_LINE_STATIC_FRAME_S);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(motion.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('runs the animation loop, reschedules frames, and cancels the outstanding frame on unmount', () => {
    mockPrefersReducedMotion(false);
    const disconnect = jest.fn();
    window.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect,
    }));

    const { unmount } = render(
      <EuiProvider>
        <div style={{ width: 80, height: 80 }}>
          <DetectionLinePreview />
        </div>
      </EuiProvider>
    );

    expect(pendingFrames.size).toBe(1);
    expect(renderDetectionLineAt).not.toHaveBeenCalled();

    flushNextFrame();

    expect(renderDetectionLineAt).toHaveBeenCalledTimes(1);
    expect(renderDetectionLineAt.mock.calls[0]?.[5]).toBeGreaterThan(0);
    expect(pendingFrames.size).toBe(1);

    flushNextFrame();

    expect(renderDetectionLineAt).toHaveBeenCalledTimes(2);
    expect(pendingFrames.size).toBe(1);
    const outstandingId = [...pendingFrames.keys()][0];

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(outstandingId);
    expect(pendingFrames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('stops the loop and draws a static frame when reduced motion becomes enabled', () => {
    const motion = mockPrefersReducedMotion(false);

    render(
      <EuiProvider>
        <div style={{ width: 80, height: 80 }}>
          <DetectionLinePreview />
        </div>
      </EuiProvider>
    );

    flushNextFrame();
    expect(renderDetectionLineAt).toHaveBeenCalledTimes(1);
    expect(pendingFrames.size).toBe(1);
    renderDetectionLineAt.mockClear();

    act(() => {
      motion.setMatches(true);
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(pendingFrames.size).toBe(0);
    expect(renderDetectionLineAt).toHaveBeenCalledTimes(1);
    expect(renderDetectionLineAt.mock.calls[0]?.[5]).toBe(DETECTION_LINE_STATIC_FRAME_S);
  });
});
