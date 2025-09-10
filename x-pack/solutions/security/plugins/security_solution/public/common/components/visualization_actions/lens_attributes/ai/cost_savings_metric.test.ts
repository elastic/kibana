/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCostSavingsMetricLensAttributes } from './cost_savings_metric';
import type { EuiThemeComputed } from '@elastic/eui';

describe('getCostSavingsMetricLensAttributes', () => {
  const mockTheme = {} as EuiThemeComputed;
  const defaultParams = {
    euiTheme: mockTheme,
    minutesPerAlert: 8,
    analystHourlyRate: 75,
    extraOptions: undefined,
    stackByField: undefined,
    esql: undefined,
    backgroundColor: '#00FF00',
  };

  it('includes the correct formula in the countColumn', () => {
    const result = getCostSavingsMetricLensAttributes({
      ...defaultParams,
      minutesPerAlert: 10,
      analystHourlyRate: 100,
    });
    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumn;
    expect(countColumn?.operationType).toBe('formula');
    // @ts-ignore
    expect(countColumn?.params.formula).toBe('count() * ((10/60)*100)');
  });

  it('applies filters from extraOptions if provided', () => {
    const filters = [{ query: { match_all: {} }, meta: {} }];
    const result = getCostSavingsMetricLensAttributes({
      ...defaultParams,
      extraOptions: { filters },
    });
    expect(result.state.filters).toBe(filters);
  });

  it('defaults filters to empty array if extraOptions is not provided', () => {
    const result = getCostSavingsMetricLensAttributes({
      ...defaultParams,
      extraOptions: undefined,
    });
    expect(result.state.filters).toEqual([]);
  });

  it('returns a LensAttributes object with required properties', () => {
    const result = getCostSavingsMetricLensAttributes({
      ...defaultParams,
    });
    expect(result).toHaveProperty('title', 'Cost Savings Metric');
    expect(result).toHaveProperty('visualizationType', 'lnsMetric');
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('references');
  });
});
