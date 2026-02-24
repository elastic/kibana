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

    it('preserves query when METADATA _id already exists', () => {
      expect(injectMetadataId('FROM logs* METADATA _id')).toBe('FROM logs* METADATA _id');
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

    it('appends _id when METADATA has _version and _index but not _id', () => {
      expect(injectMetadataId('FROM logs* METADATA _version, _index')).toBe(
        'FROM logs* METADATA _version, _index, _id'
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
      expect(injectMetadataId('FROM packetbeat*\n        | LIMIT 100')).toBe(
        'FROM packetbeat* METADATA _id | LIMIT 100'
      );
    });

    it('handles multi-line query with existing METADATA missing _id', () => {
      expect(injectMetadataId('FROM packetbeat* METADATA _index\n        | LIMIT 100')).toBe(
        'FROM packetbeat* METADATA _index, _id | LIMIT 100'
      );
    });

    it('handles multi-line query with existing METADATA _id', () => {
      expect(injectMetadataId('FROM packetbeat* METADATA\n        _id\n        | LIMIT 100')).toBe(
        'FROM packetbeat* METADATA _id | LIMIT 100'
      );
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

    it('adds _id to KEEP with non-global wildcard', () => {
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

    it('does not inject _id into KEEP that appears after DROP _id', () => {
      expect(injectMetadataId('FROM logs* | DROP _id | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | DROP _id | KEEP agent.name'
      );
    });

    it('injects _id into KEEP that appears before DROP _id', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.name | DROP _id')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id | DROP _id'
      );
    });

    it('does not inject _id into KEEP after DROP _id mid-pipeline', () => {
      expect(injectMetadataId('FROM logs* | DROP _id | EVAL x = 1 | KEEP x')).toBe(
        'FROM logs* METADATA _id | DROP _id | EVAL x = 1 | KEEP x'
      );
    });

    it('DROP multiple fields including _id stops KEEP injection downstream', () => {
      expect(injectMetadataId('FROM logs* | DROP _id, agent.type | KEEP host')).toBe(
        'FROM logs* METADATA _id | DROP _id, agent.type | KEEP host'
      );
    });

    it('DROP without _id does not affect KEEP injection', () => {
      expect(injectMetadataId('FROM logs* | DROP agent.type | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | DROP agent.type | KEEP agent.name, _id'
      );
    });
  });

  describe('complex queries', () => {
    it('handles realistic rule query with KEEP and EVAL', () => {
      expect(injectMetadataId('FROM auditbeat-* | KEEP agent.*, _id | EVAL test_id = _id')).toBe(
        'FROM auditbeat-* METADATA _id | KEEP agent.*, _id | EVAL test_id = _id'
      );
    });

    it('handles realistic rule query without _id in KEEP', () => {
      expect(injectMetadataId('FROM auditbeat-* | KEEP agent.name | LIMIT 5')).toBe(
        'FROM auditbeat-* METADATA _id | KEEP agent.name, _id | LIMIT 5'
      );
    });

    it('handles query with WHERE and no METADATA', () => {
      expect(injectMetadataId('FROM ecs_compliant | WHERE agent.name == "test-1"')).toBe(
        'FROM ecs_compliant METADATA _id | WHERE agent.name == "test-1"'
      );
    });

    it('handles query with MV_EXPAND', () => {
      expect(injectMetadataId('FROM ecs_compliant METADATA _id | MV_EXPAND agent.name')).toBe(
        'FROM ecs_compliant METADATA _id | MV_EXPAND agent.name'
      );
    });

    it('handles query with multiple indices and METADATA _index', () => {
      expect(injectMetadataId('FROM logs*, metrics* METADATA _index | SORT @timestamp')).toBe(
        'FROM logs*, metrics* METADATA _index, _id | SORT @timestamp'
      );
    });

    it('handles query used in rule mock without METADATA', () => {
      expect(
        injectMetadataId('FROM auditbeat-* | WHERE user.name == "root" OR user.name == "admin"')
      ).toBe('FROM auditbeat-* METADATA _id | WHERE user.name == "root" OR user.name == "admin"');
    });
  });

  describe('lowercase commands', () => {
    it('normalizes lowercase commands to uppercase in output', () => {
      expect(
        injectMetadataId('from logs* metadata _index | where x > 5 | keep agent.name | limit 10')
      ).toBe('FROM logs* METADATA _index, _id | WHERE x > 5 | KEEP agent.name, _id | LIMIT 10');
    });
  });
});
