/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../../../../components/test_utils/render_with_pnd_providers';
import type { PndSparklinePoint } from '../helpers/build_sparkline_series';
import { ActivitySparkline } from '.';

/** 2026-08-07T00:00:00.000Z, then the two hours after it. */
const series: PndSparklinePoint[] = [
  { time: 1_754_524_800_000, y: 0 },
  { time: 1_754_528_400_000, y: 3 },
  { time: 1_754_532_000_000, y: 1 },
];

const defaultProps = {
  action: 'contain' as const,
  label: 'Contain',
  series,
};

/** The jsdom `ResizeObserver` polyfill dispatches on a `resize` event, so a test can provoke one. */
const layOutAt = (node: HTMLElement, clientWidth: number): void => {
  Object.defineProperty(node, 'clientWidth', { configurable: true, value: clientWidth });

  act(() => {
    node.dispatchEvent(new Event('resize'));
  });
};

const sparkline = (action = 'contain'): HTMLElement =>
  screen.getByTestId(`pndBriefKpiSparkline-${action}`);

describe('ActivitySparkline', () => {
  it('renders a wrapper for the chart', () => {
    renderWithPndProviders(<ActivitySparkline {...defaultProps} />);

    expect(sparkline()).toBeInTheDocument();
  });

  /**
   * The chart is a shape, not information: the card's own `aria-label` says what the tile counts,
   * and a screen reader reading 24 hourly buckets aloud would bury it.
   */
  it('hides the chart from assistive technology', () => {
    renderWithPndProviders(<ActivitySparkline {...defaultProps} />);

    expect(sparkline()).toHaveAttribute('aria-hidden', 'true');
  });

  /** `@elastic/charts` needs a pixel width; drawing at a guessed one flashes and reflows. */
  it('draws nothing before the column has been laid out', () => {
    renderWithPndProviders(<ActivitySparkline {...defaultProps} />);

    expect(sparkline()).toBeEmptyDOMElement();
  });

  it('draws the chart once the column has a width', () => {
    renderWithPndProviders(<ActivitySparkline {...defaultProps} />);

    layOutAt(sparkline(), 240);

    expect(sparkline()).not.toBeEmptyDOMElement();
  });

  /**
   * An absent series is not a flat one. When the activity read fails there is nothing to claim about
   * the last 24 hours, so the tile keeps its count and loses its chart.
   */
  it('draws nothing when there is no series', () => {
    renderWithPndProviders(<ActivitySparkline {...defaultProps} series={[]} />);

    layOutAt(sparkline(), 240);

    expect(sparkline()).toBeEmptyDOMElement();
  });

  it('names the chart wrapper after the action it charts', () => {
    renderWithPndProviders(<ActivitySparkline {...defaultProps} action="tune" label="Tune" />);

    expect(sparkline('tune')).toBeInTheDocument();
  });
});
