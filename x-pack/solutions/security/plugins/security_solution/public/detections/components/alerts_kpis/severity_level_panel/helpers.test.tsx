/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getSeverityColor, parseSeverityData } from './helpers';
import * as mock from './mock_data';
import type { AlertsBySeverityAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import {
  getMockEuiAmsterdamTheme,
  getMockEuiBorealisTheme,
} from '../../../../common/utils/__mocks__/severity_colors';

describe('parse severity data', () => {
  test('parse alerts with data', () => {
    const res = parseSeverityData(
      mock.mockAlertsData as AlertSearchResponse<{}, AlertsBySeverityAgg>
    );
    expect(res).toEqual(mock.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseSeverityData(
      mock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsBySeverityAgg>
    );
    expect(res).toEqual([]);
  });
});

describe.each([
  { severity: 'critical', colorToken: 'euiColorVis9', themeName: 'Amsterdam' },
  { severity: 'high', colorToken: 'euiColorVis7', themeName: 'Amsterdam' },
  { severity: 'medium', colorToken: 'euiColorVis5', themeName: 'Amsterdam' },
  { severity: 'low', colorToken: 'euiColorVis0', themeName: 'Amsterdam' },
  { severity: 'critical', colorToken: 'euiColorSeverity14', themeName: 'Borealis' },
  { severity: 'high', colorToken: 'euiColorSeverity10', themeName: 'Borealis' },
  { severity: 'medium', colorToken: 'euiColorSeverity7', themeName: 'Borealis' },
  { severity: 'low', colorToken: 'euiColorVisSuccess0', themeName: 'Borealis' },
])('$themeName: getSeverityColor', ({ severity, colorToken, themeName }) => {
  const mockEuiTheme =
    themeName === 'Amsterdam' ? getMockEuiAmsterdamTheme() : getMockEuiBorealisTheme();

  test(`returns color for given severity: ${severity}`, () => {
    expect(getSeverityColor(severity, mockEuiTheme)).toEqual(colorToken);
  });
});
