/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';

import { useMeasuredWidth } from '.';

const Measured: React.FC = () => {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  return (
    <div data-test-subj="measured" ref={ref}>
      {width}
    </div>
  );
};

/** The jsdom `ResizeObserver` polyfill dispatches on a `resize` event, so a test can provoke one. */
const resizeTo = (node: HTMLElement, clientWidth: number): void => {
  Object.defineProperty(node, 'clientWidth', { configurable: true, value: clientWidth });

  act(() => {
    node.dispatchEvent(new Event('resize'));
  });
};

describe('useMeasuredWidth', () => {
  /**
   * jsdom lays nothing out, so an unmeasured element is 0 wide — which is also the real first-paint
   * state a caller has to survive before the observer reports.
   */
  it('starts at zero, before anything has been laid out', () => {
    render(<Measured />);

    expect(screen.getByTestId('measured')).toHaveTextContent('0');
  });

  it('reports the width the element was resized to', () => {
    render(<Measured />);

    resizeTo(screen.getByTestId('measured'), 240);

    expect(screen.getByTestId('measured')).toHaveTextContent('240');
  });

  it('follows the element when it is resized again', () => {
    render(<Measured />);

    const node = screen.getByTestId('measured');
    resizeTo(node, 240);
    resizeTo(node, 320);

    expect(node).toHaveTextContent('320');
  });

  it('stops observing when the element unmounts', () => {
    const disconnect = jest.fn();
    jest.spyOn(global, 'ResizeObserver').mockImplementation(() => ({
      disconnect,
      observe: jest.fn(),
      unobserve: jest.fn(),
    }));

    const { unmount } = render(<Measured />);
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});
