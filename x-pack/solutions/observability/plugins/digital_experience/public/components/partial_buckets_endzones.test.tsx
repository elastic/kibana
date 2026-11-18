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

  it('shades whole edge buckets outside the domain of areas, as Lens does', () => {
    // `isFullBin` zones lie outside the domain, so an area chart draws nothing.
    renderEndzones({ start: HOUR / 2, end: 2.5 * HOUR }, { hasBars: false });

    expect(lastShadedZones()).toEqual([
      { coordinates: { x1: 0 } },
      { coordinates: { x0: 3 * HOUR } },
    ]);
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
