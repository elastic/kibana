/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExcludeAlertsFilters, getPercentInfo } from './utils';
import { getPercChange } from './helpers';
import type { EuiThemeComputed } from '@elastic/eui';

// Mock dependencies
jest.mock('./helpers', () => ({
  getPercChange: jest.fn(),
}));

const mockGetPercChange = getPercChange as jest.MockedFunction<typeof getPercChange>;

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPercentInfo', () => {
    const defaultParams = {
      currentCount: 100,
      previousCount: 80,
      stat: '80',
      statType: 'test stat',
    };

    it('returns correct percent info for positive change', () => {
      mockGetPercChange.mockReturnValue('25.0%');

      const result = getPercentInfo(defaultParams);

      expect(result).toEqual({
        percent: '+25.0%',
        color: 'success',
        note: 'Your test stat is up by 25.0% from 80',
      });
    });

    it('returns correct percent info for negative change', () => {
      mockGetPercChange.mockReturnValue('-20.0%');

      const result = getPercentInfo(defaultParams);

      expect(result).toEqual({
        percent: '-20.0%',
        color: 'danger',
        note: 'Your test stat is down by 20.0% from 80',
      });
    });

    it('returns correct percent info for zero change', () => {
      mockGetPercChange.mockReturnValue('0.0%');

      const result = getPercentInfo(defaultParams);

      expect(result).toEqual({
        percent: '0.0%',
        color: 'hollow',
        note: 'Your test stat is unchanged',
      });
    });

    it('handles different color families correctly', () => {
      const testCases = [
        {
          colorFamily: 'default' as const,
          expectedColor: 'success',
          description: 'default color family',
        },
        {
          colorFamily: 'bright' as const,
          expectedColor: 'success',
          description: 'bright color family',
        },
      ];

      testCases.forEach(({ colorFamily, expectedColor }) => {
        mockGetPercChange.mockReturnValue('25.0%');

        const result = getPercentInfo({
          ...defaultParams,
          colorFamily,
        });

        expect(result.color).toBe(expectedColor);
      });
    });

    it('handles colors parameter correctly', () => {
      const mockColors = {
        backgroundBaseSuccess: '#success-color',
        backgroundBaseDanger: '#danger-color',
      } as EuiThemeComputed['colors'];

      const testCases = [
        {
          percentageChange: '25.0%',
          expectedColor: '#success-color',
          description: 'positive change with colors',
        },
        {
          percentageChange: '-20.0%',
          expectedColor: '#danger-color',
          description: 'negative change with colors',
        },
      ];

      testCases.forEach(({ percentageChange, expectedColor }) => {
        mockGetPercChange.mockReturnValue(percentageChange);

        const result = getPercentInfo({
          ...defaultParams,
          colors: mockColors,
        });

        expect(result.color).toBe(expectedColor);
      });
    });

    it('handles edge cases for percentage values', () => {
      const testCases = [
        { percentageChange: '0.0%', expectedPercent: '0.0%', expectedColor: 'hollow' },
        { percentageChange: '-0.0%', expectedPercent: '-0.0%', expectedColor: 'danger' },
        { percentageChange: '100.0%', expectedPercent: '+100.0%', expectedColor: 'success' },
        { percentageChange: '-100.0%', expectedPercent: '-100.0%', expectedColor: 'danger' },
      ];

      testCases.forEach(({ percentageChange, expectedPercent, expectedColor }) => {
        mockGetPercChange.mockReturnValue(percentageChange);

        const result = getPercentInfo(defaultParams);

        expect(result.percent).toBe(expectedPercent);
        expect(result.color).toBe(expectedColor);
      });
    });

    it('handles different stat types correctly', () => {
      const testCases = [
        { statType: 'alerts', expectedNote: 'Your alerts is up by 25.0% from 80' },
        { statType: 'threats', expectedNote: 'Your threats is up by 25.0% from 80' },
        { statType: 'time saved', expectedNote: 'Your time saved is up by 25.0% from 80' },
      ];

      testCases.forEach(({ statType, expectedNote }) => {
        mockGetPercChange.mockReturnValue('25.0%');

        const result = getPercentInfo({
          ...defaultParams,
          statType,
        });

        expect(result.note).toBe(expectedNote);
      });
    });
  });

  describe('getExcludeAlertsFilters', () => {
    it('returns correct filter structure for single alert ID', () => {
      const alertIds = ['alert-123'];

      const result = getExcludeAlertsFilters(alertIds);

      expect(result).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              must_not: [
                {
                  match_phrase: { 'kibana.alert.uuid': 'alert-123' },
                },
              ],
            },
          },
        },
      ]);
    });

    it('returns correct filter structure for multiple alert IDs', () => {
      const alertIds = ['alert-1', 'alert-2', 'alert-3'];

      const result = getExcludeAlertsFilters(alertIds);

      expect(result).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              must_not: [
                {
                  match_phrase: { 'kibana.alert.uuid': 'alert-1' },
                },
                {
                  match_phrase: { 'kibana.alert.uuid': 'alert-2' },
                },
                {
                  match_phrase: { 'kibana.alert.uuid': 'alert-3' },
                },
              ],
            },
          },
        },
      ]);
    });

    it('handles empty alert IDs array', () => {
      const alertIds: string[] = [];

      const result = getExcludeAlertsFilters(alertIds);

      expect(result).toEqual([
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              must_not: [],
            },
          },
        },
      ]);
    });

    it('handles different alert ID formats', () => {
      const testCases = [
        {
          alertIds: ['uuid-123-456'],
          description: 'UUID format',
        },
        {
          alertIds: ['alert_123'],
          description: 'underscore format',
        },
        {
          alertIds: ['alert-123-456-789'],
          description: 'long format',
        },
      ];

      testCases.forEach(({ alertIds }) => {
        const result = getExcludeAlertsFilters(alertIds);

        expect(result[0].query.bool.must_not).toHaveLength(alertIds.length);
        alertIds.forEach((alertId, index) => {
          expect(result[0].query.bool.must_not[index]).toEqual({
            match_phrase: { 'kibana.alert.uuid': alertId },
          });
        });
      });
    });
  });
});
