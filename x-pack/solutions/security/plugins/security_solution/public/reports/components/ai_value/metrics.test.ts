/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getValueMetrics,
  getTimeSavedHours,
  getCostSavings,
  formatDollars,
  formatThousands,
  formatPercent,
  getTimeRangeAsDays,
} from './metrics';
import moment from 'moment';

describe('metrics', () => {
  describe('getValueMetrics', () => {
    it('calculates metrics correctly', () => {
      const metrics = getValueMetrics({
        analystHourlyRate: 100,
        attackDiscoveryCount: 5,
        totalAlerts: 20,
        escalatedAlertsCount: 8,
        minutesPerAlert: 10,
      });
      expect(metrics.attackDiscoveryCount).toBe(5);
      expect(metrics.filteredAlerts).toBe(12);
      expect(metrics.filteredAlertsPerc).toBeCloseTo(60);
      expect(metrics.escalatedAlertsPerc).toBeCloseTo(40);
      expect(metrics.hoursSaved).toBeCloseTo(3.333);
      expect(metrics.totalAlerts).toBe(20);
      expect(metrics.costSavings).toBeCloseTo(333.333);
    });
  });

  describe('getTimeSavedHours', () => {
    it('returns correct hours saved', () => {
      expect(getTimeSavedHours(12, 10)).toBeCloseTo(2);
    });
  });

  describe('getCostSavings', () => {
    it('returns correct cost savings', () => {
      expect(
        getCostSavings({ alerts: 12, minutesPerAlert: 10, analystHourlyRate: 100 })
      ).toBeCloseTo(200);
    });
  });

  describe('formatDollars', () => {
    it('formats value as dollars', () => {
      expect(formatDollars(1234.56)).toContain('$1,235');
    });
  });

  describe('formatThousands', () => {
    it('formats value as thousands', () => {
      expect(formatThousands(1234)).toBe('1,234');
    });
  });

  describe('formatPercent', () => {
    it('formats value as percent', () => {
      expect(formatPercent(12.3456)).toBe('12.35%');
    });
  });

  describe('getTimeRangeAsDays', () => {
    it('returns 1 for a 1 day range', () => {
      const from = moment('2023-01-01T00:00:00Z').toISOString();
      const to = moment('2023-01-02T00:00:00Z').toISOString();
      expect(getTimeRangeAsDays({ from, to })).toBe('1');
    });

    it('returns 2 for a 2 day range', () => {
      const from = moment('2023-01-01T00:00:00Z').toISOString();
      const to = moment('2023-01-03T00:00:00Z').toISOString();
      expect(getTimeRangeAsDays({ from, to })).toBe('2');
    });

    it('returns a rounded string for less than 1 day', () => {
      const from = moment('2023-01-01T00:00:00Z').toISOString();
      const to = moment('2023-01-01T12:00:00Z').toISOString();
      expect(getTimeRangeAsDays({ from, to })).toBe('0.5');
    });

    it('returns 0 for zero duration', () => {
      const from = moment('2023-01-01T00:00:00Z').toISOString();
      const to = moment('2023-01-01T00:00:00Z').toISOString();
      expect(getTimeRangeAsDays({ from, to })).toBe('0');
    });

    it('returns correct value for fractional days (1.25 days)', () => {
      const from = moment('2023-01-01T00:00:00Z').toISOString();
      const to = moment('2023-01-02T06:00:00Z').toISOString();
      expect(getTimeRangeAsDays({ from, to })).toBe('1');
    });

    it('returns correct value for fractional days less than 1 (0.33 days)', () => {
      const from = moment('2023-01-01T00:00:00Z').toISOString();
      const to = moment('2023-01-01T08:00:00Z').toISOString();
      expect(getTimeRangeAsDays({ from, to })).toBe('0.33');
    });
  });
});
