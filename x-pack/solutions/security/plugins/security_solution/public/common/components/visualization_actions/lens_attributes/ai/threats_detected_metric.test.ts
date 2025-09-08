/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getThreatsDetectedMetricLensAttributes } from './threats_detected_metric';
import type { ExtraOptions } from '../../types';

describe('getThreatsDetectedMetricLensAttributes', () => {
  const defaultEuiTheme = {} as EuiThemeComputed;
  const defaultSpaceId = 'default';

  const defaultArgs = {
    euiTheme: defaultEuiTheme,
    spaceId: defaultSpaceId,
  };

  it('returns lens attributes with correct basic structure, state, and query configuration', () => {
    const result = getThreatsDetectedMetricLensAttributes(defaultArgs);
    expect(result).toEqual(
      expect.objectContaining({
        description: '',
        title: 'Real threats detected',
        visualizationType: 'lnsMetric',
        type: 'lens',
        updated_at: '2025-07-21T15:51:38.660Z',
        references: [],
      })
    );
    expect(result.state).toEqual(
      expect.objectContaining({
        adHocDataViews: expect.any(Object),
        datasourceStates: expect.any(Object),
        filters: [],
        internalReferences: expect.any(Object),
        query: { language: 'kuery', query: '' },
        visualization: expect.any(Object),
      })
    );
  });

  it('handles visualization, datasource, column configurations, and parameter variations correctly', () => {
    const result = getThreatsDetectedMetricLensAttributes(defaultArgs);
    expect(result.state.visualization).toEqual(
      expect.objectContaining({
        icon: 'crosshairs',
        iconAlign: 'right',
        valuesTextAlign: 'left',
        layerId: 'unifiedHistogram',
        layerType: 'data',
        metricAccessor: 'count_column',
        secondaryTrend: { type: 'none' },
        showBar: false,
      })
    );
    const datasourceStates = result.state.datasourceStates;
    expect(datasourceStates).toEqual(
      expect.objectContaining({
        formBased: expect.objectContaining({
          layers: expect.objectContaining({
            unifiedHistogram: expect.objectContaining({
              columnOrder: ['count_column'],
              columns: expect.objectContaining({
                count_column: expect.objectContaining({
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Real threats detected',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: expect.objectContaining({
                    format: { id: 'number', params: { decimals: 0 } },
                  }),
                }),
              }),
              incompleteColumns: {},
            }),
          }),
        }),
      })
    );
    expect(result.state.internalReferences).toEqual([
      {
        id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
      {
        id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
        name: 'indexpattern-datasource-layer-c17b2286-3a97-4ce3-b27c-02343d0a5d51',
        type: 'index-pattern',
      },
    ]);

    const adHocDataViews = result.state.adHocDataViews;
    expect(adHocDataViews).toEqual(
      expect.objectContaining({
        '99d292f8-524f-4aad-9e37-81c17f8331fb': expect.objectContaining({
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: {},
          fieldFormats: {},
          id: '99d292f8-524f-4aad-9e37-81c17f8331fb',
          sourceFilters: [],
          timeFieldName: '@timestamp',
          runtimeFieldMap: {},
        }),
      })
    );
    const spaceIdTestCases = [
      defaultSpaceId,
      'custom-space',
      'space-with-special-chars-123',
      '',
      '123',
      'space.with.dots',
    ];

    spaceIdTestCases.forEach((spaceId) => {
      const testResult = getThreatsDetectedMetricLensAttributes({ ...defaultArgs, spaceId });
      const testDataView =
        testResult.state.adHocDataViews?.['99d292f8-524f-4aad-9e37-81c17f8331fb'];
      const expectedName = spaceId
        ? `.alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}*`
        : `.alerts-security.attack.discovery.alerts-*,.adhoc.alerts-security.attack.discovery.alerts-*`;
      expect(testDataView?.name).toBe(expectedName);
      expect(testDataView?.title).toBe(expectedName);
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
    const euiTheme = { colors: { primary: '#0066CC' } } as EuiThemeComputed;

    expect(
      getThreatsDetectedMetricLensAttributes({ ...defaultArgs, extraOptions }).state.filters
    ).toEqual([]);
    expect(
      getThreatsDetectedMetricLensAttributes({ ...defaultArgs, stackByField: 'test.field' }).title
    ).toBe('Real threats detected');
    expect(
      getThreatsDetectedMetricLensAttributes({ ...defaultArgs, esql: 'SELECT * FROM test-*' }).state
        .query
    ).toEqual({ language: 'kuery', query: '' });
    expect(getThreatsDetectedMetricLensAttributes({ ...defaultArgs, euiTheme }).title).toBe(
      'Real threats detected'
    );
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
