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
const INTERVAL = { value: 3600, unit: 's' as const };
const POINTS = [0, HOUR, 2 * HOUR].map((timestamp) => ({ timestamp }));

const renderEndzones = (range: { start: number; end: number }) =>
  render(
    <PartialBucketsEndzones points={POINTS} interval={INTERVAL} range={range} timeZone="UTC" />,
    { wrapper: EuiProvider }
  );

const lastShadedZones = () => mockShadedZones[mockShadedZones.length - 1];

describe('PartialBucketsEndzones', () => {
  beforeEach(() => {
    mockShadedZones.length = 0;
  });

  it('shades the first bucket when the range starts inside it', () => {
    renderEndzones({ start: HOUR / 2, end: 3 * HOUR });

    expect(lastShadedZones()).toEqual([{ coordinates: { x1: HOUR / 2 } }]);
  });

  it('shades the last bucket when the range ends inside it', () => {
    renderEndzones({ start: 0, end: 2.5 * HOUR });

    expect(lastShadedZones()).toEqual([{ coordinates: { x0: 2.5 * HOUR } }]);
  });

  it('shades both edge buckets when the range cuts both', () => {
    renderEndzones({ start: HOUR / 2, end: 2.5 * HOUR });

    expect(lastShadedZones()).toHaveLength(2);
  });

  it('shades nothing when the range matches the bucket edges', () => {
    renderEndzones({ start: 0, end: 3 * HOUR });

    expect(lastShadedZones()).toEqual([]);
  });

  it('shades the empty last bucket that starts at the end of the range', () => {
    // Elasticsearch returns it for `extended_bounds` ending on a bucket edge.
    render(
      <PartialBucketsEndzones
        points={[0, HOUR, 2 * HOUR, 3 * HOUR].map((timestamp) => ({ timestamp }))}
        interval={INTERVAL}
        range={{ start: 0, end: 3 * HOUR }}
        timeZone="UTC"
      />,
      { wrapper: EuiProvider }
    );

    // It lies entirely past the range, so it is shaded from `end` on.
    expect(lastShadedZones()).toEqual([{ coordinates: { x0: 3 * HOUR } }]);
  });

  it('measures the last calendar bucket by its own length, not the shortest one', () => {
    // Monthly buckets: February is 28 days, March 31, so a range ending on March 30 cuts March.
    const months = ['2026-01-01', '2026-02-01', '2026-03-01'].map((day) => ({
      timestamp: Date.parse(`${day}T00:00:00.000Z`),
    }));
    const end = Date.parse('2026-03-30T00:00:00.000Z');

    render(
      <PartialBucketsEndzones
        points={months}
        interval={{ value: 1, unit: 'M' }}
        range={{ start: months[0].timestamp, end }}
        timeZone="UTC"
      />,
      { wrapper: EuiProvider }
    );

    expect(lastShadedZones()).toEqual([{ coordinates: { x0: end } }]);
  });

  it('renders nothing without buckets', () => {
    render(
      <PartialBucketsEndzones
        points={[]}
        interval={INTERVAL}
        range={{ start: 0, end: HOUR }}
        timeZone="UTC"
      />,
      { wrapper: EuiProvider }
    );

    expect(mockShadedZones).toHaveLength(0);
  });

  it('renders nothing before the range of the response is known', () => {
    render(
      <PartialBucketsEndzones
        points={POINTS}
        interval={INTERVAL}
        range={undefined}
        timeZone="UTC"
      />,
      { wrapper: EuiProvider }
    );

    expect(mockShadedZones).toHaveLength(0);
  });
});
