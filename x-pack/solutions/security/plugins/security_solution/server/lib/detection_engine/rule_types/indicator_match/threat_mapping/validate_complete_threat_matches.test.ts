/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateCompleteThreatMatches } from './validate_complete_threat_matches';
import type { ThreatMatchNamedQuery } from './types';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';

describe('validateCompleteThreatMatches', () => {
  // Helper function to create a threat match named query
  const createThreatQuery = (
    field: string,
    value: string,
    id: string = 'test-id',
    index: string = 'test-index'
  ): ThreatMatchNamedQuery => ({
    id,
    index,
    field,
    value,
    queryType: 'mq',
  });

  // Helper function to create a threat mapping
  const createThreatMapping = (
    entries: Array<Array<{ field: string; value: string }>>
  ): ThreatMapping =>
    entries.map((group) => ({
      entries: group.map((entry) => ({
        field: entry.field,
        type: 'mapping' as const,
        value: entry.value,
      })),
    }));

  describe('AND logic', () => {
    it('should validate complete match for single AND group', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('user.name', 'threat.indicator.user.name'),
            createThreatQuery('host.name', 'threat.indicator.host.name'),
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(true);
      expect(result.skippedIds).toEqual([]);
    });

    it('should reject partial match for single AND group', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('user.name', 'threat.indicator.user.name'),
            // Missing host.name match
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(false);
      expect(result.skippedIds).toEqual(['event-1']);
    });

    it('should reject event with no matches for single AND group', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('source.ip', 'threat.indicator.source.ip'), // Wrong field
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(false);
      expect(result.skippedIds).toEqual(['event-1']);
    });
  });

  describe('OR logic with multiple AND groups', () => {
    it('should validate event that matches first AND group completely', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
        [
          { field: 'source.ip', value: 'threat.indicator.source.ip' },
          { field: 'destination.ip', value: 'threat.indicator.destination.ip' },
        ],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('user.name', 'threat.indicator.user.name'),
            createThreatQuery('host.name', 'threat.indicator.host.name'),
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(true);
      expect(result.skippedIds).toEqual([]);
    });

    it('should validate event that matches second AND group completely', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
        [
          { field: 'source.ip', value: 'threat.indicator.source.ip' },
          { field: 'destination.ip', value: 'threat.indicator.destination.ip' },
        ],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('source.ip', 'threat.indicator.source.ip'),
            createThreatQuery('destination.ip', 'threat.indicator.destination.ip'),
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(true);
      expect(result.skippedIds).toEqual([]);
    });

    it('should reject event with partial matches across different AND groups', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
        [
          { field: 'source.ip', value: 'threat.indicator.source.ip' },
          { field: 'destination.ip', value: 'threat.indicator.destination.ip' },
        ],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('user.name', 'threat.indicator.user.name'), // Partial match from first group
            createThreatQuery('source.ip', 'threat.indicator.source.ip'), // Partial match from second group
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(false);
      expect(result.skippedIds).toEqual(['event-1']);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple events with mixed valid and invalid matches', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
        [{ field: 'source.ip', value: 'threat.indicator.source.ip' }],
      ]);

      const signalsQueryMap = new Map([
        [
          'event-1',
          [
            createThreatQuery('user.name', 'threat.indicator.user.name'),
            createThreatQuery('host.name', 'threat.indicator.host.name'),
          ],
        ],
        ['event-2', [createThreatQuery('source.ip', 'threat.indicator.source.ip')]],
        [
          'event-3',
          [
            createThreatQuery('user.name', 'threat.indicator.user.name'), // Partial match
          ],
        ],
        [
          'event-4',
          [
            createThreatQuery('destination.port', 'threat.indicator.destination.port'), // No match
          ],
        ],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(true);
      expect(result.matchedEvents.has('event-2')).toBe(true);
      expect(result.matchedEvents.has('event-3')).toBe(false);
      expect(result.matchedEvents.has('event-4')).toBe(false);
      expect(result.skippedIds).toEqual(['event-3', 'event-4']);
    });

    it('should store only matched threat queries in matchedEvents', () => {
      const threatMapping = createThreatMapping([
        [
          { field: 'user.name', value: 'threat.indicator.user.name' },
          { field: 'host.name', value: 'threat.indicator.host.name' },
        ],
      ]);

      const allThreatQueries = [
        createThreatQuery('user.name', 'threat.indicator.user.name', 'threat-1', 'index-1'),
        createThreatQuery('host.name', 'threat.indicator.host.name', 'threat-2', 'index-2'),
        createThreatQuery('source.ip', 'threat.indicator.source.ip', 'threat-3', 'index-3'), // Unmatched query
        createThreatQuery(
          'destination.port',
          'threat.indicator.destination.port',
          'threat-4',
          'index-4'
        ), // Unmatched query
      ];

      const signalsQueryMap = new Map([['event-1', allThreatQueries]]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(true);

      // Should only contain the matched queries, not all queries
      const matchedQueries = result.matchedEvents.get('event-1')!;
      expect(matchedQueries).toHaveLength(2);

      // Verify only the matched queries are included
      const matchedFields = matchedQueries.map((q) => q.field);
      expect(matchedFields).toContain('user.name');
      expect(matchedFields).toContain('host.name');
      expect(matchedFields).not.toContain('source.ip');
      expect(matchedFields).not.toContain('destination.port');
    });

    it('should handle single field AND group', () => {
      const threatMapping = createThreatMapping([
        [{ field: 'source.ip', value: 'threat.indicator.source.ip' }],
      ]);

      const signalsQueryMap = new Map([
        ['event-1', [createThreatQuery('source.ip', 'threat.indicator.source.ip')]],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.has('event-1')).toBe(true);
      expect(result.skippedIds).toEqual([]);
    });

    it('should handle empty threat mapping', () => {
      const threatMapping: ThreatMapping = [];

      const signalsQueryMap = new Map([
        ['event-1', [createThreatQuery('source.ip', 'threat.indicator.source.ip')]],
      ]);

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.size).toBe(0);
      expect(result.skippedIds).toEqual(['event-1']);
    });

    it('should handle empty signals query map', () => {
      const threatMapping = createThreatMapping([
        [{ field: 'source.ip', value: 'threat.indicator.source.ip' }],
      ]);

      const signalsQueryMap = new Map();

      const result = validateCompleteThreatMatches(signalsQueryMap, threatMapping);

      expect(result.matchedEvents.size).toBe(0);
      expect(result.skippedIds).toEqual([]);
    });
  });
});
