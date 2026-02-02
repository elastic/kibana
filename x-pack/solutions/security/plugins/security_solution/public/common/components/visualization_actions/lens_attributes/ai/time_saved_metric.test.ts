/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeSavedMetricLensAttributes } from './time_saved_metric';
import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertIndexFilter } from './helpers';

describe('getTimeSavedMetricLensAttributes', () => {
  const mockTheme = {} as EuiThemeComputed;
  const defaultSignalIndexName = '.alerts-security.alerts-default';
  const defaultParams = {
    euiTheme: mockTheme,
    minutesPerAlert: 8,
    extraOptions: undefined,
    stackByField: undefined,
    esql: undefined,
    signalIndexName: defaultSignalIndexName,
  };

  it('includes the correct formula in the count_column', () => {
    const result = getTimeSavedMetricLensAttributes({
      ...defaultParams,
      minutesPerAlert: 10,
    });
    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.count_column;
    expect(countColumn?.operationType).toBe('formula');
    // @ts-ignore
    expect(countColumn?.params.formula).toBe('(count()*10/60)');
  });

  it('applies filters from extraOptions if provided', () => {
    const filters = [{ query: { match_all: {} }, meta: {} }];
    const result = getTimeSavedMetricLensAttributes({
      ...defaultParams,
      extraOptions: { filters },
    });
    expect(result.state.filters).toEqual([getAlertIndexFilter(defaultSignalIndexName), ...filters]);
  });

  it('includes alert index filter even when extraOptions is not provided', () => {
    const result = getTimeSavedMetricLensAttributes({
      ...defaultParams,
      extraOptions: undefined,
    });
    expect(result.state.filters).toEqual([getAlertIndexFilter(defaultSignalIndexName)]);
  });

  it('includes alert index filter in filters array', () => {
    const result = getTimeSavedMetricLensAttributes(defaultParams);
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
      const result = getTimeSavedMetricLensAttributes({
        ...defaultParams,
        signalIndexName,
      });
      const expectedFilter = getAlertIndexFilter(signalIndexName);
      expect(result.state.filters).toContainEqual(expectedFilter);
    });
  });

  it('returns a LensAttributes object with required properties', () => {
    const result = getTimeSavedMetricLensAttributes({
      ...defaultParams,
    });
    expect(result).toHaveProperty('title', 'Analyst time saved');
    expect(result).toHaveProperty('visualizationType', 'lnsMetric');
    expect(result).toHaveProperty('state');
    expect(result).toHaveProperty('references');
  });
});
