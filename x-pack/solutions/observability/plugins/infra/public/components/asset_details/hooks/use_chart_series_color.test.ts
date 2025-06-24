/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { renderHook } from '@testing-library/react';
import { useChartSeriesColor } from './use_chart_series_color';

describe('useChartSeriesColor', () => {
  let seriesDefaultColor: string;

  beforeEach(() => {
    const { result } = renderHook(() => useEuiTheme());

    // Don't try to test a hardcoded value, just use what is provided by EUI.
    // If in the future this value changes, the tests won't break.
    seriesDefaultColor = result.current.euiTheme.colors.backgroundLightText;
  });

  it('returns a default color value if given no input', () => {
    const { result } = renderHook(() => useChartSeriesColor());

    expect(result.current).not.toBe('');
    expect(result.current).toBe(seriesDefaultColor);
  });

  it('returns a default color value if given an empty string', () => {
    const { result } = renderHook(() => useChartSeriesColor(''));

    expect(result.current).not.toBe('');
    expect(result.current).toBe(seriesDefaultColor);
  });

  it('returns the provided color input', () => {
    const { result } = renderHook(() => useChartSeriesColor('#fff'));

    expect(result.current).not.toBe(seriesDefaultColor);
    expect(result.current).toBe('#fff');
  });
});
