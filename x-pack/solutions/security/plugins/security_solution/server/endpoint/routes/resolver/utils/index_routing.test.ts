/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  firstConcreteIndex,
  firstProjectQualifiedConcreteIndex,
  stripRemoteIndexPatterns,
  toLocalIndexName,
} from './index_routing';

describe('Resolver index routing helpers', () => {
  describe('toLocalIndexName()', () => {
    it('should strip a project or CCS prefix', () => {
      expect(toLocalIndexName('linked-project:logs-endpoint.events-default')).toBe(
        'logs-endpoint.events-default'
      );
    });

    it('should leave a local index unchanged', () => {
      expect(toLocalIndexName('logs-endpoint.events-default')).toBe('logs-endpoint.events-default');
    });
  });

  describe('stripRemoteIndexPatterns()', () => {
    it('should leave patterns unchanged when the read cannot fan out', () => {
      expect(stripRemoteIndexPatterns(['*:logs-*', 'logs-*'], false)).toEqual([
        '*:logs-*',
        'logs-*',
      ]);
    });

    it('should drop CCS and project-prefixed patterns when the read fans out', () => {
      expect(
        stripRemoteIndexPatterns(
          ['logs-*', '*:logs-*', 'linked-project:.alerts-security.alerts-default'],
          true
        )
      ).toEqual(['logs-*']);
    });

    it('should fall back to local names when every pattern is prefixed', () => {
      expect(stripRemoteIndexPatterns(['*:logs-*', 'alias:metrics-*'], true)).toEqual([
        'logs-*',
        'metrics-*',
      ]);
    });
  });

  describe('firstConcreteIndex()', () => {
    it('should return the first non-wildcard index, including a project-qualified one', () => {
      expect(
        firstConcreteIndex(['logs-*', 'linked-project:.ds-logs-endpoint.events-default-2024.01.01'])
      ).toBe('linked-project:.ds-logs-endpoint.events-default-2024.01.01');
    });

    it('should return undefined when every entry is a wildcard pattern', () => {
      expect(firstConcreteIndex(['logs-*', 'metrics-*'])).toBeUndefined();
    });
  });

  describe('firstProjectQualifiedConcreteIndex()', () => {
    it('should return the first project-qualified concrete index', () => {
      expect(
        firstProjectQualifiedConcreteIndex([
          '.alerts-security.alerts-default',
          'logs-*',
          'linked-project:logs-endpoint.events-default',
        ])
      ).toBe('linked-project:logs-endpoint.events-default');
    });

    it('should ignore origin-only concrete names used by the flyout and resolver archives', () => {
      expect(
        firstProjectQualifiedConcreteIndex([
          '.internal.alerts-security.alerts-default-000001',
          '.alerts-security.alerts-default',
          'winlogbeat-7.11.0-default',
          'logs-endpoint.events.*',
        ])
      ).toBeUndefined();
    });
  });
});
