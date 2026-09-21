/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireConfetti } from './confetti';

describe('fireConfetti', () => {
  const raf = window.requestAnimationFrame;

  afterEach(() => {
    window.requestAnimationFrame = raf;
    document.querySelectorAll('canvas').forEach((c) => c.remove());
  });

  it('returns false and mounts nothing when prefers-reduced-motion is set', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(fireConfetti()).toBe(false);
    expect(document.querySelector('[data-test-subj="alertZeroConfettiCanvas"]')).toBeNull();
  });

  it('mounts a self-cleaning overlay canvas and starts animating', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    // Schedule-only spy: invoking the callback synchronously would run the
    // whole animation to completion (canvas self-removes) before we can assert.
    const rafSpy = jest.fn(() => 1);
    window.requestAnimationFrame = rafSpy;
    // jsdom returns null from getContext (no canvas package); stub it so the
    // real mounting + scheduling logic is what's under test.
    const ctxStub = {
      scale: jest.fn(),
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
    const getContextSpy = jest.fn().mockReturnValue(ctxStub);

    window.HTMLCanvasElement.prototype.getContext = getContextSpy as any;

    const result = fireConfetti();

    expect(result).toBe(true);
    expect(getContextSpy).toHaveBeenCalledWith('2d');
    const canvas = document.querySelector('[data-test-subj="alertZeroConfettiCanvas"]');
    expect(canvas).not.toBeNull();
    expect((canvas as HTMLElement).getAttribute('aria-hidden')).toBe('true');
    // First frame was scheduled synchronously via the spy.
    expect(rafSpy).toHaveBeenCalled();
  });
});
