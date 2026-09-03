/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSparklineTheme } from '.';

describe('getSparklineTheme', () => {
  /** The card owns the background; a chart that paints its own reads as a second panel inside it. */
  it('paints no background of its own', () => {
    expect(getSparklineTheme().background).toEqual({ color: 'transparent' });
  });

  it('reserves no margin, so 40px of card height is 40px of chart', () => {
    expect(getSparklineTheme().chartMargins).toEqual({ bottom: 0, left: 0, right: 0, top: 0 });
  });

  it('reserves no padding either', () => {
    expect(getSparklineTheme().chartPaddings).toEqual({ bottom: 0, left: 0, right: 0, top: 0 });
  });

  it('hides the horizontal gridlines, which a sparkline has no room for', () => {
    expect(getSparklineTheme().axes?.gridLine?.horizontal).toEqual({ visible: false });
  });

  it('hides the vertical gridlines', () => {
    expect(getSparklineTheme().axes?.gridLine?.vertical).toEqual({ visible: false });
  });

  it('fills the area translucently, so the stroke stays the accent', () => {
    expect(getSparklineTheme().areaSeriesStyle?.area).toEqual({ opacity: 0.2 });
  });

  it('draws the line at the width the prototype uses', () => {
    expect(getSparklineTheme().areaSeriesStyle?.line).toEqual({ strokeWidth: 2, visible: true });
  });

  /** 24 points across a 40px sparkline is a row of dots, not a trend. */
  it('never draws a point marker', () => {
    expect(getSparklineTheme().areaSeriesStyle?.point).toEqual({ visible: 'never' });
  });
});
