/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react';
import { getRiskSeverityColors, useRiskSeverityColors } from './risk_color_palette';
import { useEuiTheme } from '@elastic/eui';
import { getMockEuiAmsterdamTheme, getMockEuiBorealisTheme } from './__mocks__/severity_colors';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: jest.fn(),
}));

const EXPECTED_SEVERITY_COLOR_AMSTERDAM = {
  low: '#54B399',
  medium: '#F1D86F',
  high: '#FF7E62',
  critical: '#bd271e',
};

const EXPECTED_SEVERITY_COLOR_BOREALIS = {
  low: '#54B399',
  medium: '#D6BF57',
  high: '#DA8B45',
  critical: '#E7664C',
} as const;

describe('risk_color_palette', () => {
  const scenarios = [
    {
      mockEuiTheme: getMockEuiAmsterdamTheme(),
      themeName: 'Amsterdam',
      expected: EXPECTED_SEVERITY_COLOR_AMSTERDAM,
    },
    {
      mockEuiTheme: getMockEuiBorealisTheme(),
      themeName: 'Borealis',
      expected: EXPECTED_SEVERITY_COLOR_BOREALIS,
    },
  ];

  describe.each(scenarios)(
    '$themeName: getRiskSeverityColors',
    ({ mockEuiTheme, themeName, expected }) => {
      it(`returns the correct colors for ${themeName} theme`, () => {
        expect(getRiskSeverityColors(mockEuiTheme)).toEqual(expected);
      });
    }
  );

  describe.each(scenarios)(
    '$themeName: useRiskSeverityColors',
    ({ mockEuiTheme, themeName, expected }) => {
      const useEuiThemeMock = useEuiTheme as jest.Mock;

      it(`returns the correct colors for ${themeName} theme`, () => {
        useEuiThemeMock.mockReturnValue({
          euiTheme: mockEuiTheme,
        });
        const { result } = renderHook(() => useRiskSeverityColors());
        expect(result.current).toEqual(expected);
      });
    }
  );
});
