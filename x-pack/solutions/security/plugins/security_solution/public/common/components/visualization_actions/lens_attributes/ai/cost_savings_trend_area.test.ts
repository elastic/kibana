/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCostSavingsTrendAreaLensAttributes } from './cost_savings_trend_area';
import type { EuiThemeComputed } from '@elastic/eui';

describe('getCostSavingsTrendAreaLensAttributes', () => {
  const mockTheme = {} as EuiThemeComputed;
  const defaultParams = {
    euiTheme: mockTheme,
    minutesPerAlert: 8,
    analystHourlyRate: 75,
    extraOptions: undefined,
    stackByField: undefined,
    esql: undefined,
  };

  it('includes the correct formula in the cost column', () => {
    const result = getCostSavingsTrendAreaLensAttributes({
      ...defaultParams,
      minutesPerAlert: 10,
      analystHourlyRate: 100,
    });
    const costColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.cost_column;
    expect(costColumn?.operationType).toBe('formula');
    // @ts-ignore
    expect(costColumn?.params.formula).toBe('count() * ((10/60)*100)');
  });

  it('applies filters from extraOptions if provided', () => {
    const filters = [{ query: { match_all: {} }, meta: {} }];
    const result = getCostSavingsTrendAreaLensAttributes({
      ...defaultParams,
      extraOptions: { filters },
    });
    expect(result.state.filters).toBe(filters);
  });

  it('defaults filters to empty array if extraOptions is not provided', () => {
    const result = getCostSavingsTrendAreaLensAttributes({
      ...defaultParams,
      extraOptions: undefined,
    });
    expect(result.state.filters).toEqual([]);
  });

  it('returns a LensAttributes object with required properties', () => {
    const result = getCostSavingsTrendAreaLensAttributes({
      ...defaultParams,
    });
    expect(result).toHaveProperty('title', 'Cost Savings Trend');
    expect(result).toHaveProperty('visualizationType', 'lnsXY');
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('references');
  });
});
