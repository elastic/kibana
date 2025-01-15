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

describe('risk_color_palette', () => {
  const scenarios = [
    {
      mockEuiTheme: getMockEuiAmsterdamTheme(),
      themeName: 'Amsterdam',
      expected: {
        low: 'euiColorVis0',
        medium: 'euiColorVis5',
        high: 'euiColorVis7',
        critical: 'euiColorVis9',
      },
    },
    {
      mockEuiTheme: getMockEuiBorealisTheme(),
      themeName: 'Borealis',
      expected: {
        low: 'euiColorVisSuccess0',
        medium: 'euiColorSeverity7',
        high: 'euiColorSeverity10',
        critical: 'euiColorSeverity14',
      },
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
