/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertFilteringMetricLensAttributes } from './alert_filtering_metric';
import type { ExtraOptions } from '../../types';

interface FormulaColumn {
  params: {
    format: { id: string; params: { decimals: number } };
    formula: string;
    isFormulaBroken: boolean;
  };
}

interface MathColumn {
  params: {
    tinymathAst: {
      args: (string | number)[];
      location: { max: number; min: number };
      name: string;
      text: string;
      type: string;
    };
  };
}

describe('getAlertFilteringMetricLensAttributes', () => {
  const defaultEuiTheme = {} as EuiThemeComputed;
  const defaultTotalAlerts = 1000;

  const defaultArgs = {
    euiTheme: defaultEuiTheme,
    totalAlerts: defaultTotalAlerts,
  };

  it('returns lens attributes with correct basic structure, datasource, column, and visualization configurations', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);
    expect(result).toEqual(
      expect.objectContaining({
        title: 'Alert filtering rate',
        visualizationType: 'lnsMetric',
        type: 'lens',
      })
    );
    expect(result.state).toEqual(
      expect.objectContaining({
        adHocDataViews: {},
        datasourceStates: expect.objectContaining({
          formBased: expect.objectContaining({
            layers: expect.objectContaining({
              unifiedHistogram: expect.objectContaining({
                columnOrder: ['count_column', 'countColumnX0', 'countColumnX1'],
              }),
            }),
          }),
        }),
        query: { language: 'kuery', query: '_id :*' },
      })
    );
  });

  it('handles column configurations, visualization, references, filters, and parameter variations correctly', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);
    const layer = result.state.datasourceStates.formBased?.layers.unifiedHistogram;
    expect(layer?.columns).toEqual(
      expect.objectContaining({
        count_column: expect.objectContaining({
          label: 'Alert filtering rate',
          params: expect.objectContaining({
            formula: `count()/${defaultTotalAlerts}`,
          }),
        }),
        countColumnX0: expect.objectContaining({
          label: `Part of count()/${defaultTotalAlerts}`,
        }),
        countColumnX1: expect.objectContaining({
          label: `Part of count()/${defaultTotalAlerts}`,
          params: expect.objectContaining({
            tinymathAst: expect.objectContaining({
              args: ['countColumnX0', defaultTotalAlerts],
              text: `count()/${defaultTotalAlerts}`,
            }),
          }),
        }),
      })
    );
    expect(result.state.visualization).toEqual(
      expect.objectContaining({
        icon: 'visLine',
        layerId: 'unifiedHistogram',
      })
    );
    expect(result.references).toEqual([
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
      {
        id: '{dataViewId}',
        name: 'indexpattern-datasource-layer-3c03ff91-8a1b-4696-acd1-6f9c768ed1a3',
        type: 'index-pattern',
      },
    ]);
    const mockFilters = [
      { meta: { alias: 'test filter', disabled: false, negate: false } },
    ] as ExtraOptions['filters'];
    expect(getAlertFilteringMetricLensAttributes(defaultArgs).state.filters).toEqual([]);
    expect(
      getAlertFilteringMetricLensAttributes({ ...defaultArgs, extraOptions: {} }).state.filters
    ).toEqual([]);
    expect(
      getAlertFilteringMetricLensAttributes({
        ...defaultArgs,
        extraOptions: { filters: mockFilters },
      }).state.filters
    ).toEqual(mockFilters);
    const testCases = [500, 0, 1000000];
    testCases.forEach((totalAlerts) => {
      const testResult = getAlertFilteringMetricLensAttributes({ ...defaultArgs, totalAlerts });
      const testLayer = testResult.state.datasourceStates.formBased?.layers.unifiedHistogram;
      const testFormulaColumn = testLayer?.columns.count_column as unknown as FormulaColumn;
      const testMathColumn = testLayer?.columns.countColumnX1 as unknown as MathColumn;

      expect(testFormulaColumn?.params.formula).toBe(`count()/${totalAlerts}`);
      expect(testLayer?.columns.count_column?.label).toBe('Alert filtering rate');
      expect(testLayer?.columns.countColumnX0?.label).toBe(`Part of count()/${totalAlerts}`);
      expect(testLayer?.columns.countColumnX1?.label).toBe(`Part of count()/${totalAlerts}`);
      expect(testMathColumn?.params.tinymathAst.args).toEqual(['countColumnX0', totalAlerts]);
      expect(testMathColumn?.params.tinymathAst.text).toBe(`count()/${totalAlerts}`);
    });
    const extraOptions: ExtraOptions = {
      breakdownField: 'test.field',
      dnsIsPtrIncluded: true,
      ruleId: 'test-rule-id',
      showLegend: true,
      spaceId: 'test-space',
      status: 'open',
      filters: [
        { meta: { alias: 'test', disabled: false, negate: false } },
      ] as ExtraOptions['filters'],
    };
    expect(
      getAlertFilteringMetricLensAttributes({ ...defaultArgs, extraOptions }).state.filters
    ).toEqual(extraOptions.filters);
  });
});
