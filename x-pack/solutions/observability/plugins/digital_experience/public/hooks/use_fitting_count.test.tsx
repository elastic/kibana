/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useFittingCount } from './use_fitting_count';

/**
 * jsdom lays nothing out, so the row "wraps" when the harness says it has more buttons than fit:
 * the last item of the row then starts below the first.
 */
let capacity = Number.POSITIVE_INFINITY;
const offsetTop = jest.spyOn(HTMLElement.prototype, 'offsetTop', 'get');

beforeEach(() => {
  capacity = Number.POSITIVE_INFINITY;
  offsetTop.mockImplementation(function (this: HTMLElement) {
    const buttons = Number(this.dataset.buttons ?? 0);
    return this.dataset.position === 'last' && buttons > capacity ? 40 : 0;
  });
});

afterAll(() => offsetTop.mockRestore());

function Harness({ total, min, resetKey }: { total: number; min?: number; resetKey?: string }) {
  const { count, containerRef } = useFittingCount({ total, min, resetKey });
  return (
    <div ref={containerRef}>
      <div>
        <span data-position="first">query</span>
        <span data-position="last" data-buttons={count}>
          date picker
        </span>
      </div>
      <output data-test-subj="count">{count}</output>
    </div>
  );
}

const shown = () => Number(screen.getByTestId('count').textContent);

describe('useFittingCount', () => {
  it('keeps every item while the row does not wrap', () => {
    render(<Harness total={4} />);

    expect(shown()).toBe(4);
  });

  it('takes items away until the row stops wrapping', () => {
    capacity = 2;
    render(<Harness total={4} />);

    expect(shown()).toBe(2);
  });

  it('can take all of them away', () => {
    capacity = 0;
    render(<Harness total={4} />);

    expect(shown()).toBe(0);
  });

  it('never goes below the minimum while taking items away helps', () => {
    capacity = 3;
    render(<Harness total={4} min={3} />);

    expect(shown()).toBe(3);
  });

  it('brings every item back when the row still wraps at the minimum', () => {
    capacity = 1;
    render(<Harness total={4} min={3} />);

    expect(shown()).toBe(4);
  });

  it('brings every item back when the row wraps without any, e.g. a control with no room', () => {
    capacity = -1;
    render(<Harness total={4} />);

    expect(shown()).toBe(4);
  });

  it('fits again from the start after it gave up, when the items change', () => {
    capacity = -1;
    const { rerender } = render(<Harness total={4} resetKey="a" />);
    expect(shown()).toBe(4);

    capacity = 2;
    rerender(<Harness total={4} resetKey="b" />);

    expect(shown()).toBe(2);
  });

  it('starts over when what the items are changes, and fits again', () => {
    capacity = 1;
    const { rerender } = render(<Harness total={4} resetKey="a" />);
    expect(shown()).toBe(1);

    capacity = 3;
    rerender(<Harness total={4} resetKey="b" />);

    expect(shown()).toBe(3);
  });

  it('follows the number of items', () => {
    capacity = 2;
    const { rerender } = render(<Harness total={4} />);
    expect(shown()).toBe(2);

    rerender(<Harness total={1} />);

    expect(shown()).toBe(1);
  });

  describe('when the last item changes width', () => {
    let notify: () => void = () => {};
    let lastItemWidth = 100;
    const clientWidth = jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get');
    const originalObserver = globalThis.ResizeObserver;

    beforeEach(() => {
      lastItemWidth = 100;
      clientWidth.mockImplementation(function (this: HTMLElement) {
        return this.dataset.position === 'last' ? lastItemWidth : 1000;
      });
      // Reports a change when the test says so, like the browser does after a layout.
      globalThis.ResizeObserver = class {
        constructor(callback: ResizeObserverCallback) {
          notify = () => callback([], this);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    });

    afterEach(() => {
      globalThis.ResizeObserver = originalObserver;
    });

    afterAll(() => clientWidth.mockRestore());

    it('fits again, e.g. when a shorter label of the date picker gives room back', () => {
      capacity = 1;
      render(<Harness total={4} />);
      expect(shown()).toBe(1);

      capacity = 3;
      lastItemWidth = 60;
      act(() => notify());

      expect(shown()).toBe(3);
    });

    it('leaves the buttons as they are when no width changed', () => {
      capacity = 1;
      render(<Harness total={4} />);

      capacity = 3;
      act(() => notify());

      expect(shown()).toBe(1);
    });
  });
});
