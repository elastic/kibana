/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAttackDiscoverySchedule,
  isAttackDiscoveryScheduleArray,
  toAttackDiscoverySchedule,
  toAttackDiscoveryScheduleArray,
} from './schedule_type_guards';

// Mock valid schedule data (camelCase internal format)
const mockValidSchedule = {
  id: 'test-schedule',
  name: 'Test Schedule',
  createdBy: 'test-user',
  updatedBy: 'test-user',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  enabled: true,
  params: {
    alertsIndexPattern: 'test-*',
    apiConfig: {
      name: 'test-config',
      actionTypeId: '.gen-ai',
      connectorId: 'test-connector-id',
    },
    size: 100,
    query: { query: '*', language: 'kuery' },
    filters: [],
  },
  schedule: { interval: '1h' },
  actions: [],
};

describe('schedule_type_guards', () => {
  describe('isAttackDiscoverySchedule', () => {
    it('returns true for valid objects', () => {
      expect(isAttackDiscoverySchedule(mockValidSchedule)).toBe(true);
    });

    it('returns false for empty objects', () => {
      expect(isAttackDiscoverySchedule({})).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAttackDiscoverySchedule(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAttackDiscoverySchedule(undefined)).toBe(false);
    });

    it('returns false for string values', () => {
      expect(isAttackDiscoverySchedule('string')).toBe(false);
    });

    it('returns false for number values', () => {
      expect(isAttackDiscoverySchedule(123)).toBe(false);
    });

    it('returns false for objects missing required properties', () => {
      const incompleteSchedule = {
        id: 'test-id',
        name: 'Test Schedule',
        // Missing required properties like createdBy, updatedBy, etc.
      };
      expect(isAttackDiscoverySchedule(incompleteSchedule)).toBe(false);
    });
  });

  describe('isAttackDiscoveryScheduleArray', () => {
    it('returns true for arrays with valid schedules', () => {
      expect(isAttackDiscoveryScheduleArray([mockValidSchedule])).toBe(true);
    });

    it('returns true for empty arrays', () => {
      expect(isAttackDiscoveryScheduleArray([])).toBe(true);
    });

    it('returns false for objects', () => {
      expect(isAttackDiscoveryScheduleArray({})).toBe(false);
    });

    it('returns false for null', () => {
      expect(isAttackDiscoveryScheduleArray(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAttackDiscoveryScheduleArray(undefined)).toBe(false);
    });

    it('returns false for string values', () => {
      expect(isAttackDiscoveryScheduleArray('string')).toBe(false);
    });

    it('returns false for arrays with empty objects', () => {
      expect(isAttackDiscoveryScheduleArray([{}])).toBe(false);
    });

    it('returns false for arrays with null items', () => {
      expect(isAttackDiscoveryScheduleArray([null])).toBe(false);
    });

    it('returns false for arrays with string items', () => {
      expect(isAttackDiscoveryScheduleArray(['string'])).toBe(false);
    });
  });

  describe('toAttackDiscoverySchedule', () => {
    it('returns the value when it passes validation', () => {
      const result = toAttackDiscoverySchedule(mockValidSchedule);
      expect(result).toBe(mockValidSchedule);
    });

    it('should throw error for invalid objects', () => {
      const invalidSchedule = { invalid: true };
      expect(() => toAttackDiscoverySchedule(invalidSchedule)).toThrow(
        'Response is not in valid AttackDiscoveryApiSchedule format'
      );
    });
  });

  describe('toAttackDiscoveryScheduleArray', () => {
    it('returns array when validation passes with valid schedules', () => {
      const validArray = [mockValidSchedule];
      const result = toAttackDiscoveryScheduleArray(validArray);
      expect(result).toBe(validArray);
    });

    it('returns empty array when validation passes', () => {
      const emptyArray: unknown[] = [];
      const result = toAttackDiscoveryScheduleArray(emptyArray);
      expect(result).toBe(emptyArray);
    });

    it('should throw error for invalid arrays', () => {
      const invalidArray = [{ invalid: true }];
      expect(() => toAttackDiscoveryScheduleArray(invalidArray)).toThrow(
        'Response is not in valid AttackDiscoveryApiSchedule[] format'
      );
    });
  });
});
