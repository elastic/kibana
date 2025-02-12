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
  { severity: 'critical', colorToken: '#bd271e', themeName: 'Amsterdam' },
  { severity: 'high', colorToken: '#FF7E62', themeName: 'Amsterdam' },
  { severity: 'medium', colorToken: '#F1D86F', themeName: 'Amsterdam' },
  { severity: 'low', colorToken: '#54B399', themeName: 'Amsterdam' },
  { severity: 'critical', colorToken: '#E7664C', themeName: 'Borealis' },
  { severity: 'high', colorToken: '#DA8B45', themeName: 'Borealis' },
  { severity: 'medium', colorToken: '#D6BF57', themeName: 'Borealis' },
  { severity: 'low', colorToken: '#54B399', themeName: 'Borealis' },
])('$themeName: getSeverityColor', ({ severity, colorToken, themeName }) => {
  const mockEuiTheme =
    themeName === 'Amsterdam' ? getMockEuiAmsterdamTheme() : getMockEuiBorealisTheme();

  test(`returns color for given severity: ${severity}`, () => {
    expect(getSeverityColor(severity, mockEuiTheme)).toEqual(colorToken);
  });
});
