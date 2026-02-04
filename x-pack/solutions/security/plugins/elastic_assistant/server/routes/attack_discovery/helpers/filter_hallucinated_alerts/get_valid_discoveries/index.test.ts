/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { getValidDiscoveries } from '.';

describe('getValidDiscoveries', () => {
  const mockDiscovery1: AttackDiscovery = {
    alertIds: ['alert-1', 'alert-2', 'alert-3'],
    detailsMarkdown: 'Details 1',
    summaryMarkdown: 'Summary 1',
    timestamp: '2024-01-01T00:00:00.000Z',
    title: 'Discovery 1',
  };

  const mockDiscovery2: AttackDiscovery = {
    alertIds: ['alert-4', 'alert-5'],
    detailsMarkdown: 'Details 2',
    summaryMarkdown: 'Summary 2',
    timestamp: '2024-01-02T00:00:00.000Z',
    title: 'Discovery 2',
  };

  const mockDiscovery3: AttackDiscovery = {
    alertIds: ['alert-6', 'alert-7', 'alert-8'],
    detailsMarkdown: 'Details 3',
    summaryMarkdown: 'Summary 3',
    timestamp: '2024-01-03T00:00:00.000Z',
    title: 'Discovery 3',
  };

  describe('when all alert IDs exist', () => {
    const existingAlertIds = new Set([
      'alert-1',
      'alert-2',
      'alert-3',
      'alert-4',
      'alert-5',
      'alert-6',
      'alert-7',
      'alert-8',
    ]);
    const discoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];

    it('returns all discoveries', () => {
      const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

      expect(result).toEqual(discoveries);
    });

    it('returns the correct number of discoveries', () => {
      const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

      expect(result).toHaveLength(3);
    });
  });

  describe('when some alert IDs are missing', () => {
    describe('when entire discoveries have missing alert IDs', () => {
      const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3', 'alert-4', 'alert-5']);
      const discoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];

      it('returns only discoveries with all alert IDs present', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([mockDiscovery1, mockDiscovery2]);
      });

      it('returns the correct number of valid discoveries', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toHaveLength(2);
      });
    });

    describe('when only one alert ID is missing from a discovery', () => {
      const existingAlertIds = new Set([
        'alert-1',
        'alert-2',
        // alert-3 missing
        'alert-4',
        'alert-5',
        'alert-6',
        'alert-7',
        'alert-8',
      ]);
      const discoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];

      it('filters out the discovery with the missing alert ID', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([mockDiscovery2, mockDiscovery3]);
      });

      it('excludes the discovery from results', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).not.toContain(mockDiscovery1);
      });
    });

    describe('when all alert IDs are missing', () => {
      const existingAlertIds = new Set<string>([]);
      const discoveries = [mockDiscovery1, mockDiscovery2, mockDiscovery3];

      it('returns an empty array', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([]);
      });
    });

    describe('when some discoveries have partial matches', () => {
      const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-4']);
      const discoveries = [mockDiscovery1, mockDiscovery2];

      it('filters out all discoveries with any missing alert IDs', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([]);
      });
    });
  });

  describe('when no discoveries are provided', () => {
    const existingAlertIds = new Set(['alert-1', 'alert-2']);
    const discoveries: AttackDiscovery[] = [];

    it('returns an empty array', () => {
      const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    describe('when discoveries contain an empty alertIds array', () => {
      const discoveryWithNoAlerts: AttackDiscovery = {
        alertIds: [], // <-- empty alertIds array
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-01T00:00:00.000Z',
        title: 'Discovery with no alerts',
      };
      const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3']);
      const discoveries = [discoveryWithNoAlerts, mockDiscovery1];

      it('filters out discoveries with empty alertIds arrays', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).not.toContain(discoveryWithNoAlerts);
      });

      it('returns only discoveries with non-empty alertIds', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([mockDiscovery1]);
      });
    });

    describe('with a single discovery', () => {
      const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3']);
      const discoveries = [mockDiscovery1];

      it('returns the discovery when all alert IDs exist', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([mockDiscovery1]);
      });
    });

    describe('with overlapping alert IDs across discoveries', () => {
      const discoveryWithOverlap: AttackDiscovery = {
        alertIds: ['alert-1', 'alert-2'],
        detailsMarkdown: 'Details',
        summaryMarkdown: 'Summary',
        timestamp: '2024-01-04T00:00:00.000Z',
        title: 'Discovery with overlap',
      };
      const existingAlertIds = new Set(['alert-1', 'alert-2', 'alert-3']);
      const discoveries = [mockDiscovery1, discoveryWithOverlap];

      it('returns all discoveries when their alert IDs exist', () => {
        const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

        expect(result).toEqual([mockDiscovery1, discoveryWithOverlap]);
      });
    });
  });

  describe('discovery order preservation', () => {
    const existingAlertIds = new Set([
      'alert-1',
      'alert-2',
      'alert-3',
      'alert-4',
      'alert-5',
      'alert-6',
      'alert-7',
      'alert-8',
    ]);
    const discoveries = [mockDiscovery3, mockDiscovery1, mockDiscovery2];

    it('preserves the original order of discoveries', () => {
      const result = getValidDiscoveries({ attackDiscoveries: discoveries, existingAlertIds });

      expect(result).toEqual([mockDiscovery3, mockDiscovery1, mockDiscovery2]);
    });
  });
});
