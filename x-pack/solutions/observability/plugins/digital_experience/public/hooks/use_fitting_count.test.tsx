/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

  it('never goes below the minimum, even when the row still wraps', () => {
    capacity = 1;
    render(<Harness total={4} min={3} />);

    expect(shown()).toBe(3);
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
});
