/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useFlyoutBodyAvailableHeight } from './use_flyout_body_available_height';

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const Probe = ({ onHeight }: { onHeight: (h: number) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const height = useFlyoutBodyAvailableHeight(ref);
  onHeight(height);
  return <div ref={ref} data-test-subj="probe" />;
};

const renderInsideFlyoutBody = ({
  flyoutBottom,
  wrapperTop,
  panelPaddingBottom = '16px',
}: {
  flyoutBottom: number;
  wrapperTop: number;
  panelPaddingBottom?: string;
}) => {
  const heights: number[] = [];

  // Override prototype methods so the layout effect (which fires during the
  // first render) sees the mocked values immediately.
  const originalGetRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('euiFlyoutBody__overflow')) {
      return { bottom: flyoutBottom } as DOMRect;
    }
    if ((this as HTMLElement).dataset?.testSubj === 'probe') {
      return { top: wrapperTop } as DOMRect;
    }
    return originalGetRect.call(this);
  };

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = ((el: Element) => {
    if (el.classList.contains('euiPanel')) {
      return { paddingBottom: panelPaddingBottom } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(el);
  }) as typeof window.getComputedStyle;

  const utils = render(
    <div className="euiFlyoutBody__overflow">
      <div className="euiPanel">
        <Probe onHeight={(h) => heights.push(h)} />
      </div>
    </div>
  );

  const restore = () => {
    Element.prototype.getBoundingClientRect = originalGetRect;
    window.getComputedStyle = originalGetComputedStyle;
  };

  return { heights, restore, ...utils };
};

describe('useFlyoutBodyAvailableHeight', () => {
  const originalResizeObserver = window.ResizeObserver;

  beforeEach(() => {
    MockResizeObserver.instances = [];
    window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    window.ResizeObserver = originalResizeObserver;
  });

  it('returns flyoutBottom - wrapperTop - panel paddingBottom', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 1500,
      wrapperTop: 100,
      panelPaddingBottom: '16px',
    });
    expect(heights.at(-1)).toBe(1500 - 100 - 16);
    restore();
  });

  it('handles a zero-padding panel', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 1000,
      wrapperTop: 50,
      panelPaddingBottom: '0px',
    });
    expect(heights.at(-1)).toBe(950);
    restore();
  });

  it('clamps negative results to 0', () => {
    const { heights, restore } = renderInsideFlyoutBody({
      flyoutBottom: 100,
      wrapperTop: 200,
      panelPaddingBottom: '16px',
    });
    expect(heights.at(-1)).toBe(0);
    restore();
  });

  it('re-measures when ResizeObserver fires', () => {
    let currentFlyoutBottom = 1500;
    const heights: number[] = [];

    const originalGetRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.classList.contains('euiFlyoutBody__overflow')) {
        return { bottom: currentFlyoutBottom } as DOMRect;
      }
      if ((this as HTMLElement).dataset?.testSubj === 'probe') {
        return { top: 100 } as DOMRect;
      }
      return originalGetRect.call(this);
    };

    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = ((el: Element) => {
      if (el.classList.contains('euiPanel')) {
        return { paddingBottom: '16px' } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(el);
    }) as typeof window.getComputedStyle;

    render(
      <div className="euiFlyoutBody__overflow">
        <div className="euiPanel">
          <Probe onHeight={(h) => heights.push(h)} />
        </div>
      </div>
    );

    expect(heights.at(-1)).toBe(1500 - 100 - 16);

    currentFlyoutBottom = 2000;
    act(() => {
      MockResizeObserver.instances[0].trigger();
    });

    expect(heights.at(-1)).toBe(2000 - 100 - 16);

    Element.prototype.getBoundingClientRect = originalGetRect;
    window.getComputedStyle = originalGetComputedStyle;
  });

  it('returns 0 when not rendered inside an EuiFlyoutBody', () => {
    const heights: number[] = [];
    render(
      <div>
        <Probe onHeight={(h) => heights.push(h)} />
      </div>
    );
    expect(heights.at(-1)).toBe(0);
  });
});
