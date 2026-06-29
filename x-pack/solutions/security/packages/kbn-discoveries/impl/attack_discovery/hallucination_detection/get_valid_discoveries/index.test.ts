/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidDiscoveries } from '.';
import type { DiscoveryWithAlertIds } from '../types';

describe('getValidDiscoveries', () => {
  const mockDiscovery1: DiscoveryWithAlertIds = {
    alertIds: ['alert-1', 'alert-2'],
    title: 'Discovery 1',
  };

  const mockDiscovery2: DiscoveryWithAlertIds = {
    alertIds: ['alert-3'],
    title: 'Discovery 2',
  };

  const mockDiscovery3: DiscoveryWithAlertIds = {
    alertIds: ['alert-4', 'alert-5'],
    title: 'Discovery 3',
  };

  const mockDiscoveryWithSnakeCase: DiscoveryWithAlertIds = {
    alert_ids: ['alert-6', 'alert-7'],
    title: 'Discovery with snake_case',
  };

  describe('when all alert IDs exist', () => {
    const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5']);

    it('returns all discoveries', () => {
      const result = getValidDiscoveries({
        attackDiscoveries: [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        existingAlertIds,
      });

      expect(result).toEqual([mockDiscovery1, mockDiscovery2, mockDiscovery3]);
    });
  });

  describe('when some alert IDs are missing', () => {
    const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3']);

    it('returns only discoveries with all alert IDs present', () => {
      const result = getValidDiscoveries({
        attackDiscoveries: [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        existingAlertIds,
      });

      expect(result).toEqual([mockDiscovery1, mockDiscovery2]);
    });

    it('excludes discoveries with missing alert IDs', () => {
      const result = getValidDiscoveries({
        attackDiscoveries: [mockDiscovery1, mockDiscovery2, mockDiscovery3],
        existingAlertIds,
      });

      expect(result).not.toContain(mockDiscovery3);
    });
  });

  describe('when discovery has empty alertIds', () => {
    const mockDiscoveryEmpty: DiscoveryWithAlertIds = {
      alertIds: [],
      title: 'Empty Discovery',
    };
    const existingAlertIds = new Set(['alert-1', 'alert-2']);

    it('filters out discovery with empty alertIds', () => {
      const result = getValidDiscoveries({
        attackDiscoveries: [mockDiscovery1, mockDiscoveryEmpty],
        existingAlertIds,
      });

      expect(result).toEqual([mockDiscovery1]);
    });
  });

  describe('when using snake_case alert_ids field', () => {
    const existingAlertIds = new Set(['alert-6', 'alert-7']);

    it('returns discoveries with snake_case alert_ids', () => {
      const result = getValidDiscoveries({
        attackDiscoveries: [mockDiscoveryWithSnakeCase],
        existingAlertIds,
      });

      expect(result).toEqual([mockDiscoveryWithSnakeCase]);
    });
  });

  describe('when no alert IDs exist', () => {
    const existingAlertIds = new Set<string>();

    it('returns empty array', () => {
      const result = getValidDiscoveries({
        attackDiscoveries: [mockDiscovery1, mockDiscovery2],
        existingAlertIds,
      });

      expect(result).toEqual([]);
    });
  });
});
