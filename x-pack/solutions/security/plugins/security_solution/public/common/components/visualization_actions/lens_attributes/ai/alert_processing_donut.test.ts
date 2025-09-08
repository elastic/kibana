/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertProcessingDonutAttributes } from './alert_processing_donut';
import type { ExtraOptions } from '../../types';

interface WithParams {
  params: Record<string, unknown>;
}
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

  it('returns lens attributes with correct basic structure', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    expect(result).toHaveProperty('title', 'Alerts');
    expect(result).toHaveProperty('description', '');
    expect(result).toHaveProperty('visualizationType', 'lnsPie');
    expect(result).toHaveProperty('references', []);
  });

  it('returns lens attributes with correct state structure', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    expect(result.state).toHaveProperty('visualization');
    expect(result.state).toHaveProperty('query');
    expect(result.state).toHaveProperty('filters', []);
    expect(result.state).toHaveProperty('datasourceStates');
    expect(result.state).toHaveProperty('internalReferences');
    expect(result.state).toHaveProperty('adHocDataViews');
  });

  it('returns lens attributes with correct query configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    expect(result.state.query).toEqual({
      query: '',
      language: 'kuery',
    });
  });

  it('returns lens attributes with correct visualization configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const visualization = result.state.visualization as unknown as WithLayers;
    expect(visualization).toHaveProperty('layers');
    expect(visualization).toHaveProperty('shape', 'donut');
    expect(visualization.layers).toHaveLength(1);
  });

  it('returns lens attributes with correct layer configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const layer = (result.state.visualization as unknown as WithLayers).layers[0];
    expect(layer).toHaveProperty('categoryDisplay', 'show');
    expect(layer).toHaveProperty('emptySizeRatio', 0.9);
    expect(layer).toHaveProperty('layerId', 'unifiedHistogram');
    expect(layer).toHaveProperty('layerType', 'data');
    expect(layer).toHaveProperty('legendSize', 'medium');
    expect(layer).toHaveProperty('legendPosition', 'right');
    expect(layer).toHaveProperty('legendDisplay', 'hide');
    expect(layer).toHaveProperty('legendStats', ['percent']);
    expect(layer).toHaveProperty('metrics', ['count_column']);
    expect(layer).toHaveProperty('nestedLegend', true);
    expect(layer).toHaveProperty('numberDisplay', 'percent');
    expect(layer).toHaveProperty('primaryGroups', ['breakdown_column']);
  });

  it('returns lens attributes with correct color mapping configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const colorMapping = (result.state.visualization as unknown as WithLayers).layers[0]
      .colorMapping as Record<string, unknown>;
    expect(colorMapping).toHaveProperty('assignments');
    expect(colorMapping).toHaveProperty('colorMode', { type: 'categorical' });
    expect(colorMapping).toHaveProperty('paletteId', 'default');
    expect(colorMapping).toHaveProperty('specialAssignments');
    expect(colorMapping.assignments as unknown[]).toHaveLength(2);
    expect(colorMapping.specialAssignments as unknown[]).toHaveLength(1);
  });

  it('returns lens attributes with correct AI Filtered color assignment', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const colorMapping = (result.state.visualization as unknown as WithLayers).layers[0]
      .colorMapping as Record<string, unknown>;
    const assignment = (colorMapping.assignments as unknown[])[0] as Record<string, unknown>;
    expect(assignment).toHaveProperty('color', {
      colorIndex: 0,
      paletteId: 'default',
      type: 'categorical',
    });
    expect(assignment).toHaveProperty('rules', [
      {
        type: 'raw',
        value: 'AI Filtered',
      },
    ]);
    expect(assignment).toHaveProperty('touched', false);
  });

  it('returns lens attributes with correct Escalated color assignment', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const colorMapping = (result.state.visualization as unknown as WithLayers).layers[0]
      .colorMapping as Record<string, unknown>;
    const assignment = (colorMapping.assignments as unknown[])[1] as Record<string, unknown>;
    expect(assignment).toHaveProperty('color', {
      colorIndex: 9,
      paletteId: 'default',
      type: 'categorical',
    });
    expect(assignment).toHaveProperty('rules', [
      {
        type: 'raw',
        value: 'Escalated',
      },
    ]);
    expect(assignment).toHaveProperty('touched', false);
  });

  it('returns lens attributes with correct special assignments', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const colorMapping = (result.state.visualization as unknown as WithLayers).layers[0]
      .colorMapping as Record<string, unknown>;
    const assignment = (colorMapping.specialAssignments as unknown[])[0] as Record<string, unknown>;
    expect(assignment).toHaveProperty('color', {
      type: 'loop',
    });
    expect(assignment).toHaveProperty('rules', [
      {
        type: 'other',
      },
    ]);
    expect(assignment).toHaveProperty('touched', false);
  });

  it('returns lens attributes with correct datasource states', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const datasourceStates = result.state.datasourceStates;
    expect(datasourceStates).toHaveProperty('formBased');
    expect(datasourceStates.formBased).toHaveProperty('layers');
    expect(datasourceStates.formBased?.layers).toHaveProperty('unifiedHistogram');
  });

  it('returns lens attributes with correct layer column configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const layer = result.state.datasourceStates.formBased?.layers.unifiedHistogram;
    expect(layer).toHaveProperty('columnOrder', ['breakdown_column', 'count_column']);
    expect(layer).toHaveProperty('columns');
    expect(layer).toHaveProperty('incompleteColumns', {});
  });

  it('returns lens attributes with correct breakdown_column configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const breakdownColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram?.columns.breakdown_column;
    expect(breakdownColumn).toHaveProperty('dataType', 'string');
    expect(breakdownColumn).toHaveProperty('isBucketed', true);
    expect(breakdownColumn).toHaveProperty('label', 'Alert processing category');
    expect(breakdownColumn).toHaveProperty('operationType', 'terms');
    expect(breakdownColumn).toHaveProperty('scale', 'ordinal');
    expect(breakdownColumn).toHaveProperty('sourceField', 'processing_analytics_rtf');
  });

  it('returns lens attributes with correct breakdown_column parameters', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const breakdownColumn = result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns
      .breakdown_column as unknown as WithParams;
    expect(breakdownColumn?.params).toHaveProperty('missingBucket', true);
    expect(breakdownColumn?.params).toHaveProperty('orderBy', {
      columnId: 'count_column',
      type: 'column',
    });
    expect(breakdownColumn?.params).toHaveProperty('orderDirection', 'desc');
    expect(breakdownColumn?.params).toHaveProperty('otherBucket', true);
    expect(breakdownColumn?.params).toHaveProperty('parentFormat', {
      id: 'terms',
    });
    expect(breakdownColumn?.params).toHaveProperty('size', 3);
  });

  it('returns lens attributes with correct count_column configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const countColumn =
      result.state.datasourceStates.formBased?.layers.unifiedHistogram?.columns.count_column;
    expect(countColumn).toHaveProperty('dataType', 'number');
    expect(countColumn).toHaveProperty('isBucketed', false);
    expect(countColumn).toHaveProperty('label', 'Count of records');
    expect(countColumn).toHaveProperty('operationType', 'count');
    expect(countColumn).toHaveProperty('scale', 'ratio');
    expect(countColumn).toHaveProperty('sourceField', '___records___');
  });

  it('returns lens attributes with correct count_column parameters', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const countColumn = result.state.datasourceStates.formBased?.layers.unifiedHistogram.columns
      .count_column as unknown as WithParams;
    expect(countColumn?.params).toHaveProperty('format', {
      id: 'number',
      params: {
        decimals: 0,
      },
    });
  });

  it('returns lens attributes with correct internal references', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    expect(result.state.internalReferences).toHaveLength(1);
    expect(result.state.internalReferences?.[0]).toEqual({
      id: 'db828b69-bb21-4b92-bc33-56e3b01da790',
      name: 'indexpattern-datasource-layer-unifiedHistogram',
      type: 'index-pattern',
    });
  });

  it('returns lens attributes with correct adHocDataViews configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const adHocDataViews = result.state.adHocDataViews;
    expect(adHocDataViews).toHaveProperty('db828b69-bb21-4b92-bc33-56e3b01da790');
  });

  it('returns lens attributes with correct data view configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const dataView = result.state.adHocDataViews?.[
      'db828b69-bb21-4b92-bc33-56e3b01da790'
    ] as unknown as Record<string, unknown>;
    expect(dataView).toHaveProperty('allowHidden', false);
    expect(dataView).toHaveProperty('allowNoIndex', false);
    expect(dataView).toHaveProperty('fieldAttrs', {
      processing_analytics_rtf: {},
    });
    expect(dataView).toHaveProperty('fieldFormats', {});
    expect(dataView).toHaveProperty('id', 'db828b69-bb21-4b92-bc33-56e3b01da790');
    expect(dataView).toHaveProperty('name', `.alerts-security.alerts-${defaultSpaceId}`);
    expect(dataView).toHaveProperty('sourceFilters', []);
    expect(dataView).toHaveProperty('timeFieldName', '@timestamp');
    expect(dataView).toHaveProperty('title', `.alerts-security.alerts-${defaultSpaceId}`);
  });

  it('returns lens attributes with correct runtime field configuration', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const runtimeFieldMap = (
      result.state.adHocDataViews?.[
        'db828b69-bb21-4b92-bc33-56e3b01da790'
      ] as unknown as WithRuntimeFieldMap
    )?.runtimeFieldMap;

    // Test runtime field map structure
    expect(runtimeFieldMap).toHaveProperty('processing_analytics_rtf');
    expect(runtimeFieldMap?.processing_analytics_rtf).toHaveProperty('type', 'keyword');
    expect(runtimeFieldMap?.processing_analytics_rtf).toHaveProperty('script');

    // Test runtime field script content
    const script = runtimeFieldMap?.processing_analytics_rtf.script;
    expect(script).toHaveProperty('source');
    expect(script?.source).toContain(JSON.stringify(defaultAttackAlertIds));
    expect(script?.source).toContain('emit("Escalated")');
    expect(script?.source).toContain('emit("AI Filtered")');
  });

  it('returns lens attributes with various attackAlertIds configurations', () => {
    const testCases = [
      {
        attackAlertIds: ['different-alert-1', 'different-alert-2'],
        description: 'multiple alerts',
      },
      { attackAlertIds: [], description: 'empty array' },
      { attackAlertIds: ['single-alert'], description: 'single alert' },
      {
        attackAlertIds: Array.from({ length: 100 }, (_, i) => `alert-${i}`),
        description: 'large number of alerts',
      },
    ];

    testCases.forEach(({ attackAlertIds, description }) => {
      const result = getAlertProcessingDonutAttributes({
        ...defaultArgs,
        attackAlertIds,
      });

      const script = (
        result.state.adHocDataViews?.[
          'db828b69-bb21-4b92-bc33-56e3b01da790'
        ] as unknown as WithRuntimeFieldMap
      )?.runtimeFieldMap.processing_analytics_rtf.script;
      expect(script?.source).toContain(JSON.stringify(attackAlertIds));
    });
  });

  it('returns lens attributes with various spaceId configurations', () => {
    const testCases = [
      { spaceId: 'custom-space', description: 'custom space' },
      { spaceId: 'space-with-special-chars-123', description: 'space with special characters' },
    ];

    testCases.forEach(({ spaceId, description }) => {
      const result = getAlertProcessingDonutAttributes({
        ...defaultArgs,
        spaceId,
      });

      const dataView = result.state.adHocDataViews?.[
        'db828b69-bb21-4b92-bc33-56e3b01da790'
      ] as unknown as Record<string, unknown>;
      expect(dataView?.name).toBe(`.alerts-security.alerts-${spaceId}`);
      expect(dataView?.title).toBe(`.alerts-security.alerts-${spaceId}`);
    });
  });

  it('returns lens attributes with extraOptions parameter', () => {
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
    const result = getAlertProcessingDonutAttributes({
      ...defaultArgs,
      extraOptions,
    });

    // The function doesn't use extraOptions, so it should return the same result
    expect(result.state.filters).toEqual([]);
  });
});
