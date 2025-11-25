/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCostSavingsMetricLensAttributes } from './cost_savings_metric';
import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertIndexFilter } from './helpers';

describe('getCostSavingsMetricLensAttributes', () => {
  const mockTheme = {} as EuiThemeComputed;
  const defaultSignalIndexName = '.alerts-security.alerts-default';
  const defaultParams = {
    euiTheme: mockTheme,
    minutesPerAlert: 8,
    analystHourlyRate: 75,
    extraOptions: undefined,
    stackByField: undefined,
    esql: undefined,
    backgroundColor: '#00FF00',
    signalIndexName: defaultSignalIndexName,
  };

  it('returns correct lens attributes with formula and filter handling', () => {
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
    expect(result).toHaveProperty('title', 'Cost Savings Metric');
    expect(result).toHaveProperty('visualizationType', 'lnsMetric');
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('references');
    const filters = [{ query: { match_all: {} }, meta: {} }];
    const resultWithFilters = getCostSavingsMetricLensAttributes({
      ...defaultParams,
      extraOptions: { filters },
    });
    expect(resultWithFilters.state.filters).toEqual([
      getAlertIndexFilter(defaultSignalIndexName),
      ...filters,
    ]);

    const resultWithoutFilters = getCostSavingsMetricLensAttributes({
      ...defaultParams,
      extraOptions: undefined,
    });
    expect(resultWithoutFilters.state.filters).toEqual([
      getAlertIndexFilter(defaultSignalIndexName),
    ]);
  });

  it('includes alert index filter in filters array', () => {
    const result = getCostSavingsMetricLensAttributes(defaultParams);
    const expectedFilter = getAlertIndexFilter(defaultSignalIndexName);
    expect(result.state.filters).toContainEqual(expectedFilter);
  });

  it('handles different signal index names correctly', () => {
    const testCases = [
      '.alerts-security.alerts-default',
      '.alerts-security.alerts-custom-space',
      'custom-alerts-index',
    ];

    testCases.forEach((signalIndexName) => {
      const result = getCostSavingsMetricLensAttributes({
        ...defaultParams,
        signalIndexName,
      });
      const expectedFilter = getAlertIndexFilter(signalIndexName);
      expect(result.state.filters).toContainEqual(expectedFilter);
    });
  });
});
