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

  it('returns lens attributes with correct basic structure', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    expect(result).toHaveProperty('description', '');
    expect(result).toHaveProperty('title', 'Alert filtering rate');
    expect(result).toHaveProperty('visualizationType', 'lnsMetric');
    expect(result).toHaveProperty('type', 'lens');
    expect(result).toHaveProperty('version', 'WzI0LDFd');
    expect(result).toHaveProperty('updated_at', '2025-07-21T15:51:38.660Z');
  });

  it('returns lens attributes with correct state structure', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    expect(result.state).toHaveProperty('adHocDataViews', {});
    expect(result.state).toHaveProperty('datasourceStates');
    expect(result.state).toHaveProperty('filters', []);
    expect(result.state).toHaveProperty('internalReferences', []);
    expect(result.state).toHaveProperty('query', { language: 'kuery', query: '_id :*' });
    expect(result.state).toHaveProperty('visualization');
  });

  it('returns lens attributes with correct datasource states', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const datasourceStates = result.state.datasourceStates;
    expect(datasourceStates).toHaveProperty('formBased');
    expect(datasourceStates.formBased).toHaveProperty('layers');
    expect(datasourceStates.formBased?.layers).toHaveProperty('unifiedHistogram');
  });

  it('returns lens attributes with correct layer configuration', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const layer = result.state.datasourceStates.formBased?.layers.unifiedHistogram;
    expect(layer).toHaveProperty('columnOrder', ['count_column', 'countColumnX0', 'countColumnX1']);
    expect(layer).toHaveProperty('columns');
    expect(layer).toHaveProperty('incompleteColumns', {});
  });

  it('returns lens attributes with correct count_column configuration', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.count_column;
    expect(countColumn).toHaveProperty('customLabel', true);
    expect(countColumn).toHaveProperty('dataType', 'number');
    expect(countColumn).toHaveProperty('isBucketed', false);
    expect(countColumn).toHaveProperty('label', 'Alert filtering rate');
    expect(countColumn).toHaveProperty('operationType', 'formula');
    expect(countColumn).toHaveProperty('references', ['countColumnX1']);
  });

  it('returns lens attributes with correct formula parameters', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.count_column;
    const formulaColumn = countColumn as unknown as FormulaColumn;
    expect(formulaColumn?.params).toHaveProperty('format', {
      id: 'percent',
      params: { decimals: 2 },
    });
    expect(formulaColumn?.params).toHaveProperty('formula', `count()/${defaultTotalAlerts}`);
    expect(formulaColumn?.params).toHaveProperty('isFormulaBroken', false);
  });

  it('returns lens attributes with correct countColumnX0 configuration', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const countColumnX0 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX0;
    const countColumn = countColumnX0 as unknown as { params: { emptyAsNull: boolean } };

    expect(countColumnX0).toHaveProperty('customLabel', true);
    expect(countColumnX0).toHaveProperty('dataType', 'number');
    expect(countColumnX0).toHaveProperty('isBucketed', false);
    expect(countColumnX0).toHaveProperty('label', `Part of count()/${defaultTotalAlerts}`);
    expect(countColumnX0).toHaveProperty('operationType', 'count');
    expect(countColumnX0).toHaveProperty('sourceField', '___records___');
    expect(countColumn?.params).toHaveProperty('emptyAsNull', false);
  });

  it('returns lens attributes with correct countColumnX1 configuration', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const countColumnX1 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX1;
    expect(countColumnX1).toHaveProperty('customLabel', true);
    expect(countColumnX1).toHaveProperty('dataType', 'number');
    expect(countColumnX1).toHaveProperty('isBucketed', false);
    expect(countColumnX1).toHaveProperty('label', `Part of count()/${defaultTotalAlerts}`);
    expect(countColumnX1).toHaveProperty('operationType', 'math');
    expect(countColumnX1).toHaveProperty('references', ['countColumnX0']);
  });

  it('returns lens attributes with correct math operation parameters', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const countColumnX1 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX1;
    const mathColumn = countColumnX1 as unknown as MathColumn;
    const tinymathAst = mathColumn?.params.tinymathAst;

    expect(tinymathAst).toHaveProperty('args', ['countColumnX0', defaultTotalAlerts]);
    expect(tinymathAst).toHaveProperty('location', { max: 12, min: 0 });
    expect(tinymathAst).toHaveProperty('name', 'divide');
    expect(tinymathAst).toHaveProperty('text', `count()/${defaultTotalAlerts}`);
    expect(tinymathAst).toHaveProperty('type', 'function');
  });

  it('returns lens attributes with correct visualization configuration', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    const visualization = result.state.visualization;
    expect(visualization).toHaveProperty('icon', 'visLine');
    expect(visualization).toHaveProperty('iconAlign', 'right');
    expect(visualization).toHaveProperty('valuesTextAlign', 'left');
    expect(visualization).toHaveProperty('layerId', 'unifiedHistogram');
    expect(visualization).toHaveProperty('layerType', 'data');
    expect(visualization).toHaveProperty('metricAccessor', 'count_column');
    expect(visualization).toHaveProperty('secondaryTrend', { type: 'none' });
    expect(visualization).toHaveProperty('showBar', false);
  });

  it('returns lens attributes with correct references', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    expect(result.references).toHaveLength(2);
    expect(result.references[0]).toEqual({
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-unifiedHistogram',
      type: 'index-pattern',
    });
    expect(result.references[1]).toEqual({
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-3c03ff91-8a1b-4696-acd1-6f9c768ed1a3',
      type: 'index-pattern',
    });
  });

  it('returns lens attributes with empty filters when extraOptions is undefined', () => {
    const result = getAlertFilteringMetricLensAttributes(defaultArgs);

    expect(result.state.filters).toEqual([]);
  });

  it('returns lens attributes with empty filters when extraOptions.filters is undefined', () => {
    const extraOptions: ExtraOptions = {};
    const result = getAlertFilteringMetricLensAttributes({
      ...defaultArgs,
      extraOptions,
    });

    expect(result.state.filters).toEqual([]);
  });

  it('returns lens attributes with provided filters when extraOptions.filters is defined', () => {
    const mockFilters = [
      { meta: { alias: 'test filter', disabled: false, negate: false } },
    ] as ExtraOptions['filters'];
    const extraOptions: ExtraOptions = { filters: mockFilters };
    const result = getAlertFilteringMetricLensAttributes({
      ...defaultArgs,
      extraOptions,
    });

    expect(result.state.filters).toEqual(mockFilters);
  });

  it('returns lens attributes with different totalAlerts values', () => {
    const totalAlerts = 500;
    const result = getAlertFilteringMetricLensAttributes({
      ...defaultArgs,
      totalAlerts,
    });

    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.count_column;
    const formulaColumn = countColumn as unknown as FormulaColumn;
    expect(formulaColumn?.params.formula).toBe(`count()/${totalAlerts}`);
    expect(countColumn?.label).toBe('Alert filtering rate');

    const countColumnX0 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX0;
    expect(countColumnX0?.label).toBe(`Part of count()/${totalAlerts}`);

    const countColumnX1 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX1;
    const mathColumn = countColumnX1 as unknown as MathColumn;
    expect(countColumnX1?.label).toBe(`Part of count()/${totalAlerts}`);
    expect(mathColumn?.params.tinymathAst.args).toEqual(['countColumnX0', totalAlerts]);
    expect(mathColumn?.params.tinymathAst.text).toBe(`count()/${totalAlerts}`);
  });

  it('returns lens attributes with zero totalAlerts', () => {
    const totalAlerts = 0;
    const result = getAlertFilteringMetricLensAttributes({
      ...defaultArgs,
      totalAlerts,
    });

    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.count_column;
    const formulaColumn = countColumn as unknown as FormulaColumn;
    expect(formulaColumn?.params.formula).toBe('count()/0');

    const countColumnX1 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX1;
    const mathColumn = countColumnX1 as unknown as MathColumn;
    expect(mathColumn?.params.tinymathAst.args).toEqual(['countColumnX0', 0]);
    expect(mathColumn?.params.tinymathAst.text).toBe('count()/0');
  });

  it('returns lens attributes with large totalAlerts values', () => {
    const totalAlerts = 1000000;
    const result = getAlertFilteringMetricLensAttributes({
      ...defaultArgs,
      totalAlerts,
    });

    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.count_column;
    const formulaColumn = countColumn as unknown as FormulaColumn;
    expect(formulaColumn?.params.formula).toBe(`count()/${totalAlerts}`);

    const countColumnX1 =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns.countColumnX1;
    const mathColumn = countColumnX1 as unknown as MathColumn;
    expect(mathColumn?.params.tinymathAst.args).toEqual(['countColumnX0', totalAlerts]);
    expect(mathColumn?.params.tinymathAst.text).toBe(`count()/${totalAlerts}`);
  });

  it('returns lens attributes with extraOptions containing multiple properties', () => {
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
    const result = getAlertFilteringMetricLensAttributes({
      ...defaultArgs,
      extraOptions,
    });

    expect(result.state.filters).toEqual(extraOptions.filters);
  });
});
