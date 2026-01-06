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

  it('returns lens attributes with correct basic structure', () => {
    const result = getThreatsDetectedMetricLensAttributes(defaultArgs);
    expect(result).toEqual(
      expect.objectContaining({
        title: 'Real threats detected',
        visualizationType: 'lnsMetric',
        type: 'lens',
      })
    );
  });

  it('handles spaceId parameter variations correctly', () => {
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
