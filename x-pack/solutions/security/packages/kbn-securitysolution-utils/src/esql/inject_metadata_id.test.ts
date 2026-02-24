/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectMetadataId } from './inject_metadata_id';

describe('injectMetadataId', () => {
  describe('aggregating queries (unchanged)', () => {
    it.each([
      ['FROM logs* | STATS count(*) BY host'],
      ['FROM logs* | STATS total = SUM(bytes) BY host | WHERE total > 100'],
      ['from logs* | stats c = count(*) by fieldA'],
      ['FROM logs* METADATA _id | STATS count(*) BY host'],
      ['FROM logs* | STATS count(*) BY host | KEEP host'],
    ])('returns aggregating query unchanged: "%s"', (query) => {
      expect(injectMetadataId(query)).toBe(query);
    });
  });

  describe('METADATA _id injection into FROM', () => {
    it('injects METADATA _id when FROM has no metadata', () => {
      expect(injectMetadataId('FROM logs*')).toBe('FROM logs* METADATA _id');
    });

    it('injects METADATA _id with lowercase from', () => {
      expect(injectMetadataId('from logs*')).toBe('from logs* METADATA _id');
    });

    it('preserves query when METADATA _id already exists', () => {
      expect(injectMetadataId('FROM logs* METADATA _id')).toBe('FROM logs* METADATA _id');
    });

    it('preserves query when metadata _id already exists (lowercase)', () => {
      expect(injectMetadataId('from logs* metadata _id')).toBe('from logs* metadata _id');
    });

    it('preserves query when METADATA _id exists with other fields', () => {
      expect(injectMetadataId('FROM logs* METADATA _id, _version, _index')).toBe(
        'FROM logs* METADATA _id, _version, _index'
      );
    });

    it('appends _id when METADATA exists without _id', () => {
      expect(injectMetadataId('FROM logs* METADATA _index')).toBe(
        'FROM logs* METADATA _index, _id'
      );
    });

    it('appends _id when metadata has _version and _index but not _id', () => {
      expect(injectMetadataId('from logs* metadata _version, _index')).toBe(
        'from logs* metadata _version, _index, _id'
      );
    });

    it('injects METADATA _id with multiple source indices', () => {
      expect(injectMetadataId('FROM logs*, other-index*')).toBe(
        'FROM logs*, other-index* METADATA _id'
      );
    });

    it('injects METADATA _id before pipe commands', () => {
      expect(injectMetadataId('FROM logs* | WHERE x > 5')).toBe(
        'FROM logs* METADATA _id | WHERE x > 5'
      );
    });

    it('injects METADATA _id before multiple pipe commands', () => {
      expect(injectMetadataId('FROM logs* | WHERE x > 5 | SORT x | LIMIT 10')).toBe(
        'FROM logs* METADATA _id | WHERE x > 5 | SORT x | LIMIT 10'
      );
    });

    it('handles trailing whitespace', () => {
      expect(injectMetadataId('FROM logs*  ')).toBe('FROM logs* METADATA _id');
    });

    it('handles multi-line query', () => {
      const query = `from packetbeat*
        | limit 100`;
      const expected = `from packetbeat* METADATA _id
        | limit 100`;
      expect(injectMetadataId(query)).toBe(expected);
    });

    it('handles multi-line query with existing metadata missing _id', () => {
      const query = `from packetbeat* metadata _index
        | limit 100`;
      const expected = `from packetbeat* metadata _index, _id
        | limit 100`;
      expect(injectMetadataId(query)).toBe(expected);
    });

    it('handles multi-line query with existing metadata _id', () => {
      const query = `from packetbeat* metadata
        _id
        | limit 100`;
      expect(injectMetadataId(query)).toBe(query);
    });
  });

  describe('KEEP best-effort fix', () => {
    it('adds _id to KEEP when missing', () => {
      expect(injectMetadataId('FROM logs* METADATA _id | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id'
      );
    });

    it('does not add _id to KEEP when already present', () => {
      expect(injectMetadataId('FROM logs* METADATA _id | KEEP agent.name, _id')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id'
      );
    });

    it('adds _id to KEEP with wildcard', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.*')).toBe(
        'FROM logs* METADATA _id | KEEP agent.*, _id'
      );
    });

    it('handles KEEP followed by other commands', () => {
      expect(injectMetadataId('FROM logs* | KEEP a, b | EVAL c = a')).toBe(
        'FROM logs* METADATA _id | KEEP a, b, _id | EVAL c = a'
      );
    });

    it('adds _id to KEEP when METADATA injection also happens', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id'
      );
    });

    it('handles KEEP with _id already present and no METADATA', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.name, _id')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id'
      );
    });

    it('handles lowercase keep', () => {
      expect(injectMetadataId('from logs* metadata _id | keep agent.name')).toBe(
        'from logs* metadata _id | keep agent.name, _id'
      );
    });
  });

  describe('DROP _id (accepted limitation)', () => {
    it('does not modify DROP _id - accepted limitation', () => {
      expect(injectMetadataId('FROM logs* | DROP _id')).toBe('FROM logs* METADATA _id | DROP _id');
    });

    it('injects METADATA but does not remove explicit DROP', () => {
      expect(injectMetadataId('FROM logs* METADATA _id | DROP _id')).toBe(
        'FROM logs* METADATA _id | DROP _id'
      );
    });
  });

  describe('complex queries', () => {
    it('handles realistic rule query with keep and eval', () => {
      const query = 'from auditbeat-* | keep agent.*, _id | eval test_id = _id';
      const expected = 'from auditbeat-* METADATA _id | keep agent.*, _id | eval test_id = _id';
      expect(injectMetadataId(query)).toBe(expected);
    });

    it('handles realistic rule query without _id in keep', () => {
      const query = 'from auditbeat-* | keep agent.name | limit 5';
      const expected = 'from auditbeat-* METADATA _id | keep agent.name, _id | limit 5';
      expect(injectMetadataId(query)).toBe(expected);
    });

    it('handles query with WHERE and no metadata', () => {
      const query = 'from ecs_compliant | where agent.name=="test-1"';
      const expected = 'from ecs_compliant METADATA _id | where agent.name=="test-1"';
      expect(injectMetadataId(query)).toBe(expected);
    });

    it('handles query with mv_expand', () => {
      const query = 'from ecs_compliant METADATA _id | mv_expand agent.name';
      expect(injectMetadataId(query)).toBe(query);
    });

    it('handles query with multiple indices and metadata _index', () => {
      expect(injectMetadataId('from logs*, metrics* metadata _index | sort @timestamp')).toBe(
        'from logs*, metrics* metadata _index, _id | sort @timestamp'
      );
    });

    it('handles query used in rule mock without metadata', () => {
      const query = 'from auditbeat-* | where user.name=="root" or user.name=="admin"';
      const expected =
        'from auditbeat-* METADATA _id | where user.name=="root" or user.name=="admin"';
      expect(injectMetadataId(query)).toBe(expected);
    });
  });
});
