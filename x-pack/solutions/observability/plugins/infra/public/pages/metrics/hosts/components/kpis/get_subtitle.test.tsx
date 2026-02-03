/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSubtitle } from './kpi_charts';

describe('getSubtitle', () => {
  describe('max formulas', () => {
    it('should return "Max" when formula starts with max and limit >= hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'max(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('Max');
    });

    it('should return "Max (of X hosts)" when formula starts with max and limit < hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'max(system.cpu.user.pct)', limit: 50, hostCount: 100 })
      ).toBe('Max (of 50 hosts)');
    });

    it('should return "Max" when formula starts with "1 - max" and limit >= hostCount', () => {
      expect(
        getSubtitle({
          formulaValue: '1 - max(system.memory.actual.free)',
          limit: 50,
          hostCount: 20,
        })
      ).toBe('Max');
    });

    it('should return "Max (of X hosts)" when formula starts with "1 - max" and limit < hostCount', () => {
      expect(
        getSubtitle({
          formulaValue: '1 - max(system.memory.actual.free)',
          limit: 50,
          hostCount: 100,
        })
      ).toBe('Max (of 50 hosts)');
    });

    it('should handle parentheses around max', () => {
      expect(
        getSubtitle({ formulaValue: '(max(system.cpu.total))', limit: 50, hostCount: 20 })
      ).toBe('Max');
    });
  });

  describe('avg formulas', () => {
    it('should return "Average" when formula starts with avg and limit >= hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'avg(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should return "Average (of X hosts)" when formula starts with avg and limit < hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'avg(system.cpu.user.pct)', limit: 50, hostCount: 100 })
      ).toBe('Average (of 50 hosts)');
    });

    it('should return "Average" when formula starts with "1 - avg" and limit >= hostCount', () => {
      expect(
        getSubtitle({
          formulaValue: '1 - avg(system.memory.actual.free)',
          limit: 50,
          hostCount: 20,
        })
      ).toBe('Average');
    });

    it('should return "Average (of X hosts)" when formula starts with "1 - avg" and limit < hostCount', () => {
      expect(
        getSubtitle({
          formulaValue: '1 - avg(system.memory.actual.free)',
          limit: 50,
          hostCount: 100,
        })
      ).toBe('Average (of 50 hosts)');
    });

    it('should handle parentheses around avg', () => {
      expect(
        getSubtitle({ formulaValue: '(avg(system.cpu.total))', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should return "Average" when formula starts with "average" (spelled out)', () => {
      expect(
        getSubtitle({ formulaValue: 'average(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should return "Average (of X hosts)" when formula starts with "average" and limit < hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'average(system.cpu.user.pct)', limit: 50, hostCount: 100 })
      ).toBe('Average (of 50 hosts)');
    });

    it('should handle parentheses around average', () => {
      expect(
        getSubtitle({ formulaValue: '(average(system.cpu.total))', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });
  });

  describe('formulas without max or avg as first word', () => {
    it('should return empty string when formula does not start with max or avg and limit >= hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should return "of X hosts" when formula does not start with max or avg and limit < hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(system.cpu.user.pct)', limit: 50, hostCount: 100 })
      ).toBe('of 50 hosts');
    });

    it('should return "Average" when avg wraps max and limit >= hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'avg(max(system.cpu.user.pct))', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should return fallback when max is nested inside another function', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(max(system.cpu.user.pct))', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should return "of X hosts" when max is nested inside another function and limit < hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(max(system.cpu.user.pct))', limit: 50, hostCount: 100 })
      ).toBe('of 50 hosts');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for empty formula when limit >= hostCount', () => {
      expect(getSubtitle({ formulaValue: '', limit: 50, hostCount: 20 })).toBe('');
    });

    it('should return "of X hosts" for empty formula when limit < hostCount', () => {
      expect(getSubtitle({ formulaValue: '', limit: 50, hostCount: 100 })).toBe('of 50 hosts');
    });

    it('should not match max if it is part of a longer word', () => {
      expect(
        getSubtitle({ formulaValue: 'maximum(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should not match avg/average if it is part of a longer word', () => {
      expect(
        getSubtitle({ formulaValue: 'averaging(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('');
    });
  });

  describe('parentheses and function ordering', () => {
    it('should match max when formula starts with parentheses around max', () => {
      expect(
        getSubtitle({ formulaValue: '(max(system.cpu.total))', limit: 50, hostCount: 20 })
      ).toBe('Max');
    });

    it('should match avg when formula starts with parentheses around avg', () => {
      expect(
        getSubtitle({ formulaValue: '(avg(system.cpu.total))', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should NOT match when max is nested inside another function', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(max(system.cpu.user.pct))', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should NOT match when avg is nested inside another function', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(avg(system.cpu.user.pct))', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should match avg when avg wraps max', () => {
      expect(
        getSubtitle({ formulaValue: 'avg(max(system.cpu.user.pct))', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should NOT match when min wraps max', () => {
      expect(
        getSubtitle({ formulaValue: 'min(max(system.cpu.user.pct))', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should match max with complex arithmetic and parentheses before it', () => {
      expect(
        getSubtitle({ formulaValue: '((1 - max(system.memory.free)))', limit: 50, hostCount: 20 })
      ).toBe('Max');
    });

    it('should match avg with complex arithmetic and parentheses before it', () => {
      expect(
        getSubtitle({ formulaValue: '((1 - avg(system.memory.free)))', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });
  });

  describe('limit boundary conditions', () => {
    it('should return "Max" when limit equals hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'max(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('Max');
    });

    it('should return "Average" when limit equals hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'avg(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('Average');
    });

    it('should return empty string for other formulas when limit equals hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'sum(system.cpu.user.pct)', limit: 50, hostCount: 20 })
      ).toBe('');
    });

    it('should return "Max (of X hosts)" when limit is 1 less than hostCount', () => {
      expect(
        getSubtitle({ formulaValue: 'max(system.cpu.user.pct)', limit: 49, hostCount: 50 })
      ).toBe('Max (of 49 hosts)');
    });
  });
});
