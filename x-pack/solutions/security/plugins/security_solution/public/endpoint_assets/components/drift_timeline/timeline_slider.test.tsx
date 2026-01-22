/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimelineSlider } from './timeline_slider';
import type { DriftHistogramBucket } from '../../../../../../common/endpoint_assets/types';

describe('TimelineSlider', () => {
  const referenceTime = new Date('2026-01-15T12:00:00Z');
  const rangeStart = new Date('2026-01-15T11:30:00Z');
  const rangeEnd = new Date('2026-01-15T12:30:00Z');
  const mockOnRangeChange = jest.fn();

  const histogramData: DriftHistogramBucket[] = [
    { timestamp: '2026-01-15T11:00:00Z', count: 5 },
    { timestamp: '2026-01-15T11:30:00Z', count: 10 },
    { timestamp: '2026-01-15T12:00:00Z', count: 15 },
    { timestamp: '2026-01-15T12:30:00Z', count: 8 },
  ];

  beforeEach(() => {
    mockOnRangeChange.mockClear();
  });

  it('renders timeline markers', () => {
    render(
      <TimelineSlider
        referenceTime={referenceTime}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeChange={mockOnRangeChange}
      />
    );

    expect(screen.getByText('-1h')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('+1h')).toBeInTheDocument();
  });

  it('renders with histogram data', () => {
    const { container } = render(
      <TimelineSlider
        referenceTime={referenceTime}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        histogramData={histogramData}
        onRangeChange={mockOnRangeChange}
      />
    );

    expect(container).toBeInTheDocument();
  });

  it('displays selected range information', () => {
    render(
      <TimelineSlider
        referenceTime={referenceTime}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeChange={mockOnRangeChange}
      />
    );

    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
  });
});
