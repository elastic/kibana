/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getThreatsDetectedMetricLensAttributes } from './threats_detected_metric';
import type { ExtraOptions } from '../../types';

interface WithParams {
  params: Record<string, unknown>;
}

describe('getThreatsDetectedMetricLensAttributes', () => {
  const defaultEuiTheme = {} as EuiThemeComputed;
  const defaultSpaceId = 'default';

  const defaultArgs = {
    euiTheme: defaultEuiTheme,
    spaceId: defaultSpaceId,
  };

  it('returns lens attributes with correct basic structure, state, and query configuration', () => {
    const result = getThreatsDetectedMetricLensAttributes(defaultArgs);

    // Basic structure
    expect(result).toHaveProperty('description', '');
    expect(result).toHaveProperty('title', 'Real threats detected');
    expect(result).toHaveProperty('visualizationType', 'lnsMetric');
    expect(result).toHaveProperty('type', 'lens');
    expect(result).toHaveProperty('version', 'WzI0LDFd');
    expect(result).toHaveProperty('updated_at', '2025-07-21T15:51:38.660Z');
    expect(result).toHaveProperty('references', []);

    // State structure
    expect(result.state).toHaveProperty('adHocDataViews');
    expect(result.state).toHaveProperty('datasourceStates');
    expect(result.state).toHaveProperty('filters', []);
    expect(result.state).toHaveProperty('internalReferences');
    expect(result.state).toHaveProperty('query');
    expect(result.state).toHaveProperty('visualization');

    // Query configuration
    expect(result.state.query).toEqual({
      language: 'kuery',
      query: '',
    });
  });

  it('returns lens attributes with correct visualization, datasource, and column configurations', () => {
    const result = getThreatsDetectedMetricLensAttributes(defaultArgs);

    // Visualization configuration
    const visualization = result.state.visualization;
    expect(visualization).toHaveProperty('icon', 'crosshairs');
    expect(visualization).toHaveProperty('iconAlign', 'right');
    expect(visualization).toHaveProperty('valuesTextAlign', 'left');
    expect(visualization).toHaveProperty('layerId', 'unifiedHistogram');
    expect(visualization).toHaveProperty('layerType', 'data');
    expect(visualization).toHaveProperty('metricAccessor', 'count_column');
    expect(visualization).toHaveProperty('secondaryTrend', { type: 'none' });
    expect(visualization).toHaveProperty('showBar', false);

    // Datasource states
    const datasourceStates = result.state.datasourceStates;
    expect(datasourceStates).toHaveProperty('formBased');
    expect(datasourceStates.formBased).toHaveProperty('layers');
    expect(datasourceStates.formBased?.layers).toHaveProperty('unifiedHistogram');

    // Layer configuration
    const layer = datasourceStates.formBased?.layers.unifiedHistogram;
    expect(layer).toHaveProperty('columnOrder', ['count_column']);
    expect(layer).toHaveProperty('columns');
    expect(layer).toHaveProperty('incompleteColumns', {});

    // Count column configuration
    const countColumn = layer?.columns.count_column;
    expect(countColumn).toHaveProperty('customLabel', true);
    expect(countColumn).toHaveProperty('dataType', 'number');
    expect(countColumn).toHaveProperty('isBucketed', false);
    expect(countColumn).toHaveProperty('label', 'Real threats detected');
    expect(countColumn).toHaveProperty('operationType', 'count');
    expect(countColumn).toHaveProperty('scale', 'ratio');
    expect(countColumn).toHaveProperty('sourceField', '___records___');

    // Count column parameters
    const countParams = countColumn as unknown as WithParams;
    expect(countParams?.params).toHaveProperty('format', {
      id: 'number',
      params: { decimals: 0 },
    });
  });

  it('returns lens attributes with correct internal references and data view configuration', () => {
    const result = getThreatsDetectedMetricLensAttributes(defaultArgs);

    // Internal references
    expect(result.state.internalReferences).toHaveLength(2);
    expect(result.state.internalReferences?.[0]).toEqual({
      id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
      name: 'indexpattern-datasource-layer-unifiedHistogram',
      type: 'index-pattern',
    });
    expect(result.state.internalReferences?.[1]).toEqual({
      id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
      name: 'indexpattern-datasource-layer-c17b2286-3a97-4ce3-b27c-02343d0a5d51',
      type: 'index-pattern',
    });

    // AdHoc data views
    const adHocDataViews = result.state.adHocDataViews;
    expect(adHocDataViews).toHaveProperty('99d292f8-524f-4aad-9e37-81c17f8331fb');

    // Data view configuration
    const dataView = adHocDataViews?.['99d292f8-524f-4aad-9e37-81c17f8331fb'];
    expect(dataView).toHaveProperty('allowHidden', false);
    expect(dataView).toHaveProperty('allowNoIndex', false);
    expect(dataView).toHaveProperty('fieldAttrs', {});
    expect(dataView).toHaveProperty('fieldFormats', {});
    expect(dataView).toHaveProperty('id', '99d292f8-524f-4aad-9e37-81c17f8331fb');
    expect(dataView).toHaveProperty('sourceFilters', []);
    expect(dataView).toHaveProperty('timeFieldName', '@timestamp');
    expect(dataView).toHaveProperty('runtimeFieldMap', {});
  });

  it('handles various spaceId configurations and unused parameters correctly', () => {
    // Test various spaceId configurations
    const spaceIdTestCases = [
      { spaceId: defaultSpaceId },
      { spaceId: 'custom-space' },
      { spaceId: 'space-with-special-chars-123' },
      { spaceId: '' },
      { spaceId: '123' },
      { spaceId: 'space.with.dots' },
    ];

    spaceIdTestCases.forEach(({ spaceId }) => {
      const result = getThreatsDetectedMetricLensAttributes({
        ...defaultArgs,
        spaceId,
      });

      const dataView = result.state.adHocDataViews?.['99d292f8-524f-4aad-9e37-81c17f8331fb'];
      const expectedName = spaceId
        ? `.alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}*`
        : `.alerts-security.attack.discovery.alerts-*,.adhoc.alerts-security.attack.discovery.alerts-*`;
      expect(dataView?.name).toBe(expectedName);
      expect(dataView?.title).toBe(expectedName);
    });

    // Test unused parameters don't affect the result
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
    const euiTheme = { colors: { primary: '#0066CC' } } as EuiThemeComputed;

    const resultWithExtraOptions = getThreatsDetectedMetricLensAttributes({
      ...defaultArgs,
      extraOptions,
    });
    expect(resultWithExtraOptions.state.filters).toEqual([]);

    const resultWithStackByField = getThreatsDetectedMetricLensAttributes({
      ...defaultArgs,
      stackByField: 'test.field',
    });
    expect(resultWithStackByField.title).toBe('Real threats detected');

    const resultWithEsql = getThreatsDetectedMetricLensAttributes({
      ...defaultArgs,
      esql: 'SELECT * FROM test-*',
    });
    expect(resultWithEsql.state.query).toEqual({
      language: 'kuery',
      query: '',
    });

    const resultWithEuiTheme = getThreatsDetectedMetricLensAttributes({
      ...defaultArgs,
      euiTheme,
    });
    expect(resultWithEuiTheme.title).toBe('Real threats detected');

    // Test with all parameters provided
    const resultWithAllParams = getThreatsDetectedMetricLensAttributes({
      euiTheme,
      spaceId: 'test-space',
      stackByField: 'test.field',
      extraOptions,
      esql: 'SELECT * FROM test-*',
    });

    const dataView =
      resultWithAllParams.state.adHocDataViews?.['99d292f8-524f-4aad-9e37-81c17f8331fb'];
    const expectedName = `.alerts-security.attack.discovery.alerts-test-space*,.adhoc.alerts-security.attack.discovery.alerts-test-space*`;
    expect(dataView?.name).toBe(expectedName);
    expect(dataView?.title).toBe(expectedName);
  });
});
