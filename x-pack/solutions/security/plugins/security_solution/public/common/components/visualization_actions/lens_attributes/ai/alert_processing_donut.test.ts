/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { getAlertProcessingDonutAttributes } from './alert_processing_donut';

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
        visualizationType: 'lnsPie',
      })
    );

    const visualization = result.state.visualization as unknown as WithLayers;
    expect(visualization).toEqual(
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({
            layerId: 'unifiedHistogram',
            legendDisplay: 'hide',
          }),
        ]),
        shape: 'donut',
      })
    );
  });

  it('returns lens attributes with correct data view configurations', () => {
    const result = getAlertProcessingDonutAttributes(defaultArgs);

    const adHocDataViews = result.state.adHocDataViews;
    expect(adHocDataViews).toEqual(
      expect.objectContaining({
        'db828b69-bb21-4b92-bc33-56e3b01da790': expect.objectContaining({
          name: `.alerts-security.alerts-${defaultSpaceId}`,
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
  });
});
