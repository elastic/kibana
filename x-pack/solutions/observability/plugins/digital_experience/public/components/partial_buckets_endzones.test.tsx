/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { RectAnnotationProps } from '@elastic/charts';
import { PartialBucketsEndzones } from './partial_buckets_endzones';
import { getTimeChartXDomain } from '../utils/histogram_interval';

const mockShadedZones: RectAnnotationProps['dataValues'][] = [];

// jsdom draws no canvas, so the test reads the zones `Endzones` hands to the annotation.
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    RectAnnotation: (props: RectAnnotationProps) => {
      mockShadedZones.push(props.dataValues);
      return null;
    },
  };
});

const HOUR = 60 * 60 * 1000;
const POINTS = [0, HOUR, 2 * HOUR].map((timestamp) => {
  return { timestamp };
});

const renderEndzones = (
  range: { start: number; end: number } | undefined,
  { points = POINTS, hasBars = true }: { points?: typeof POINTS; hasBars?: boolean } = {}
) => {
  const xDomain = getTimeChartXDomain({
    points,
    histogram: range && { interval: { value: 3600, unit: 's' }, ...range },
    timeZone: 'UTC',
    hasBars,
  });
  return render(<PartialBucketsEndzones xDomain={xDomain} />, { wrapper: EuiProvider });
};

const lastShadedZones = () => {
  return mockShadedZones[mockShadedZones.length - 1];
};

describe('PartialBucketsEndzones', () => {
  beforeEach(() => {
    mockShadedZones.length = 0;
  });

  it('shades the first bucket of bars when the range starts inside it', () => {
    renderEndzones({ start: HOUR / 2, end: 3 * HOUR });

    expect(lastShadedZones()).toEqual([{ coordinates: { x1: HOUR / 2 } }]);
  });

  it('shades the last bucket of bars when the range ends inside it', () => {
    renderEndzones({ start: 0, end: 2.5 * HOUR });

    expect(lastShadedZones()).toEqual([{ coordinates: { x0: 2.5 * HOUR } }]);
  });

  it('shades nothing when the range matches the bucket edges', () => {
    renderEndzones({ start: 0, end: 3 * HOUR });

    expect(lastShadedZones()).toEqual([]);
  });

  it('shades the partial edge buckets of lines and areas inside their domain', () => {
    // Their domain reaches the last bucket's end, from 0 to 3 hours: the zones run from its edges
    // to the range's, over the parts of the edge buckets outside it.
    renderEndzones({ start: HOUR / 2, end: 2.5 * HOUR }, { hasBars: false });

    expect(lastShadedZones()).toEqual([
      { coordinates: { x1: HOUR / 2 } },
      { coordinates: { x0: 2.5 * HOUR } },
    ]);
  });

  it('shades nothing on lines and areas either when the range matches the bucket edges', () => {
    renderEndzones({ start: 0, end: 3 * HOUR }, { hasBars: false });

    expect(lastShadedZones()).toEqual([]);
  });

  it('shades the rest of a last month longer than the shortest one', () => {
    // February sets the shortest bucket; the range ends inside March, the last one
    const months = ['2026-01-01', '2026-02-01', '2026-03-01'].map((day) => ({
      timestamp: Date.parse(`${day}T00:00:00.000Z`),
    }));
    const end = Date.parse('2026-03-30T00:00:00.000Z');
    const xDomain = getTimeChartXDomain({
      points: months,
      histogram: {
        interval: { value: 1, unit: 'M' },
        start: Date.parse('2026-01-01T00:00:00.000Z'),
        end,
      },
      timeZone: 'UTC',
      hasBars: true,
    });
    render(<PartialBucketsEndzones xDomain={xDomain} />, { wrapper: EuiProvider });

    expect(lastShadedZones()).toEqual([{ coordinates: { x0: end } }]);
  });

  it('renders nothing without buckets', () => {
    renderEndzones({ start: 0, end: HOUR }, { points: [] });

    expect(mockShadedZones).toHaveLength(0);
  });

  it('renders nothing before the range of the response is known', () => {
    renderEndzones(undefined);

    expect(mockShadedZones).toHaveLength(0);
  });
});
