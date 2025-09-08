/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertProcessingDonutAttributes } from './alert_processing_donut';
import type { ExtraOptions } from '../../types';

interface WithLayers {
  layers: Array<Record<string, unknown>>;
}
interface WithRuntimeFieldMap {
  runtimeFieldMap: Record<string, { script: { source: string } }>;
}

describe('getAlertProcessingDonutAttributes', () => {
  const defaultEuiTheme = {} as EuiThemeComputed;
  const defaultAttackAlertIds = ['alert-1', 'alert-2', 'alert-3'];
  const defaultSpaceId = 'default';

  const defaultArgs = {
    euiTheme: defaultEuiTheme,
    attackAlertIds: defaultAttackAlertIds,
    spaceId: defaultSpaceId,
  };

  it('returns lens attributes with correct basic structure, visualization, and layer configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);
    expect(result).toEqual(
      expect.objectContaining({
        title: 'Alerts',
        description: '',
        visualizationType: 'lnsPie',
        references: [],
      })
    );
    expect(result.state).toEqual(
      expect.objectContaining({
        visualization: expect.any(Object),
        query: { query: '', language: 'kuery' },
        filters: [],
        datasourceStates: expect.any(Object),
        internalReferences: expect.any(Object),
        adHocDataViews: expect.any(Object),
      })
    );
    const visualization = result.state.visualization as unknown as WithLayers;
    expect(visualization).toEqual(
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({
            categoryDisplay: 'show',
            emptySizeRatio: 0.9,
            layerId: 'unifiedHistogram',
            layerType: 'data',
            legendSize: 'medium',
            legendPosition: 'right',
            legendDisplay: 'hide',
            legendStats: ['percent'],
            metrics: ['count_column'],
            nestedLegend: true,
            numberDisplay: 'percent',
            primaryGroups: ['breakdown_column'],
          }),
        ]),
        shape: 'donut',
      })
    );
  });

  it('returns lens attributes with correct color mapping, datasource, column, and data view configurations', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);
    const colorMapping = (result.state.visualization as unknown as WithLayers).layers[0]
      .colorMapping as Record<string, unknown>;
    expect(colorMapping).toEqual(
      expect.objectContaining({
        assignments: expect.arrayContaining([
          expect.objectContaining({
            color: { colorIndex: 0, paletteId: 'default', type: 'categorical' },
            rules: [{ type: 'raw', value: 'AI Filtered' }],
            touched: false,
          }),
          expect.objectContaining({
            color: { colorIndex: 9, paletteId: 'default', type: 'categorical' },
            rules: [{ type: 'raw', value: 'Escalated' }],
            touched: false,
          }),
        ]),
        colorMode: { type: 'categorical' },
        paletteId: 'default',
        specialAssignments: expect.arrayContaining([
          expect.objectContaining({
            color: { type: 'loop' },
            rules: [{ type: 'other' }],
            touched: false,
          }),
        ]),
      })
    );
    const datasourceStates = result.state.datasourceStates;
    expect(datasourceStates).toEqual(
      expect.objectContaining({
        formBased: expect.objectContaining({
          layers: expect.objectContaining({
            unifiedHistogram: expect.objectContaining({
              columnOrder: ['breakdown_column', 'count_column'],
              columns: expect.objectContaining({
                breakdown_column: expect.objectContaining({
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Alert processing category',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: 'processing_analytics_rtf',
                  params: expect.objectContaining({
                    missingBucket: true,
                    orderBy: { columnId: 'count_column', type: 'column' },
                    orderDirection: 'desc',
                    otherBucket: true,
                    parentFormat: { id: 'terms' },
                    size: 3,
                  }),
                }),
                count_column: expect.objectContaining({
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Count of records',
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
        id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
    ]);

    const adHocDataViews = result.state.adHocDataViews;
    expect(adHocDataViews).toEqual(
      expect.objectContaining({
        'db828b69-bb21-4b92-bc33-56e3b01da790': expect.objectContaining({
          allowHidden: false,
          allowNoIndex: false,
          fieldAttrs: { processing_analytics_rtf: {} },
          fieldFormats: {},
          id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
          name: `.alerts-security.alerts-${defaultSpaceId}`,
          sourceFilters: [],
          timeFieldName: '@timestamp',
          title: `.alerts-security.alerts-${defaultSpaceId}`,
        }),
      })
    );
  });

  it('handles runtime field configuration, parameter variations, and extraOptions correctly', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);
    const runtimeFieldMap = (
      result.state.adHocDataViews?.[
        'db828b69-bb21-4b92-bc33-56e3b01da790'
      ] as unknown as WithRuntimeFieldMap
    )?.runtimeFieldMap;
    expect(runtimeFieldMap).toHaveProperty('processing_analytics_rtf');
    expect(runtimeFieldMap?.processing_analytics_rtf).toHaveProperty('type', 'keyword');
    expect(runtimeFieldMap?.processing_analytics_rtf).toHaveProperty('script');

    const script = runtimeFieldMap?.processing_analytics_rtf.script;
    expect(script).toHaveProperty('source');
    expect(script?.source).toContain(JSON.stringify(defaultAttackAlertIds));
    expect(script?.source).toContain('emit("Escalated")');
    expect(script?.source).toContain('emit("AI Filtered")');
    const testCases = [
      { attackAlertIds: ['different-alert-1', 'different-alert-2'], spaceId: 'custom-space' },
      { attackAlertIds: [], spaceId: 'space-with-special-chars-123' },
      { attackAlertIds: ['single-alert'], spaceId: defaultSpaceId },
    ];

    testCases.forEach(({ attackAlertIds, spaceId }) => {
      const testResult = getAlertProcessingDonutAttributes({
        ...defaultArgs,
        attackAlertIds,
        spaceId,
      });
      const testScript = (
        testResult.state.adHocDataViews?.[
          'db828b69-bb21-4b92-bc33-56e3b01da790'
        ] as unknown as WithRuntimeFieldMap
      )?.runtimeFieldMap.processing_analytics_rtf.script;
      expect(testScript?.source).toContain(JSON.stringify(attackAlertIds));

      const dataView = testResult.state.adHocDataViews?.[
        'db828b69-bb21-4b92-bc33-56e3b01da790'
      ] as unknown as Record<string, unknown>;
      expect(dataView?.name).toBe(`.alerts-security.alerts-${spaceId}`);
      expect(dataView?.title).toBe(`.alerts-security.alerts-${spaceId}`);
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
    const resultWithExtraOptions = getAlertProcessingDonutAttributes({
      ...defaultArgs,
      extraOptions,
    });
    expect(resultWithExtraOptions.state.filters).toEqual([]);
  });
});
