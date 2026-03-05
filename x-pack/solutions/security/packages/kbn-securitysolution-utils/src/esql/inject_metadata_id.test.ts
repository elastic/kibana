/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectMetadataId } from './inject_metadata_id';

describe('injectMetadataId', () => {
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

    it('handles trailing whitespace', () => {
      expect(injectMetadataId('FROM logs*  ')).toBe('FROM logs* METADATA _id');
    });

    it('handles multi-line query', () => {
      expect(injectMetadataId('FROM packetbeat*\n        | LIMIT 100')).toBe(
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

    it('adds _id to KEEP with partial wildcard', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.*')).toBe(
        'FROM logs* METADATA _id | KEEP agent.*, _id'
      );
    });

    it('handles KEEP followed by other commands', () => {
      expect(injectMetadataId('FROM logs* | KEEP a, b | EVAL c = a')).toBe(
        'FROM logs* METADATA _id | KEEP a, b, _id | EVAL c = a'
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

    it('DROP with wildcard _* stops KEEP injection', () => {
      expect(injectMetadataId('FROM logs* | DROP _* | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | DROP _* | KEEP agent.name'
      );
    });

    it('DROP with global wildcard * stops KEEP injection', () => {
      expect(injectMetadataId('FROM logs* | DROP * | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | DROP * | KEEP agent.name'
      );
    });
  });

  describe('RENAME _id (stops KEEP injection)', () => {
    it('does not inject _id into KEEP after RENAME _id AS', () => {
      expect(injectMetadataId('FROM logs* | RENAME _id AS doc_id | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | RENAME _id AS doc_id | KEEP agent.name'
      );
    });

    it('injects _id into KEEP before RENAME _id AS', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.name | RENAME _id AS doc_id')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id | RENAME _id AS doc_id'
      );
    });

    it('RENAME of a different column does not affect KEEP injection', () => {
      expect(injectMetadataId('FROM logs* | RENAME host AS hostname | KEEP hostname')).toBe(
        'FROM logs* METADATA _id | RENAME host AS hostname | KEEP hostname, _id'
      );
    });

    it('RENAME _id mid-pipeline stops injection for downstream KEEP', () => {
      expect(
        injectMetadataId('FROM logs* | KEEP a, _id | RENAME _id AS my_id | KEEP a, my_id')
      ).toBe('FROM logs* METADATA _id | KEEP a, _id | RENAME _id AS my_id | KEEP a, my_id');
    });

    it('RENAME other_col AS _id does NOT stop KEEP injection (known use case)', () => {
      expect(injectMetadataId('FROM logs* | RENAME doc_id AS _id | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | RENAME doc_id AS _id | KEEP agent.name, _id'
      );
    });
  });

  describe('EVAL _id (stops KEEP injection)', () => {
    it('does not inject _id into KEEP after EVAL _id = expr', () => {
      expect(injectMetadataId('FROM logs* | EVAL _id = "overwritten" | KEEP agent.name')).toBe(
        'FROM logs* METADATA _id | EVAL _id = "overwritten" | KEEP agent.name'
      );
    });

    it('injects _id into KEEP before EVAL _id = expr', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.name | EVAL _id = "overwritten"')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id | EVAL _id = "overwritten"'
      );
    });

    it('EVAL of a different column does not affect KEEP injection', () => {
      expect(injectMetadataId('FROM logs* | EVAL x = 1 | KEEP x')).toBe(
        'FROM logs* METADATA _id | EVAL x = 1 | KEEP x, _id'
      );
    });

    it('EVAL _id mid-pipeline stops injection for downstream KEEP', () => {
      expect(injectMetadataId('FROM logs* | KEEP a, _id | EVAL _id = "test" | KEEP a, _id')).toBe(
        'FROM logs* METADATA _id | KEEP a, _id | EVAL _id = "test" | KEEP a, _id'
      );
    });
  });

  describe('DISSECT/GROK (does not stop KEEP injection)', () => {
    it('injects _id into KEEP after DISSECT', () => {
      expect(injectMetadataId('FROM logs* | DISSECT message "%{parsed}" | KEEP parsed')).toBe(
        'FROM logs* METADATA _id | DISSECT message "%{parsed}" | KEEP parsed, _id'
      );
    });

    it('injects _id into KEEP after GROK', () => {
      expect(injectMetadataId('FROM logs* | GROK message "%{WORD:parsed}" | KEEP parsed')).toBe(
        'FROM logs* METADATA _id | GROK message "%{WORD:parsed}" | KEEP parsed, _id'
      );
    });

    it('injects _id into KEEP before DISSECT', () => {
      expect(injectMetadataId('FROM logs* | KEEP agent.name | DISSECT message "%{parsed}"')).toBe(
        'FROM logs* METADATA _id | KEEP agent.name, _id | DISSECT message "%{parsed}"'
      );
    });
  });

  describe('KEEP with wildcards', () => {
    it('adds _id to KEEP * (redundant but harmless)', () => {
      expect(injectMetadataId('FROM logs* | KEEP *')).toBe('FROM logs* METADATA _id | KEEP *, _id');
    });

    it('adds _id to KEEP _* (redundant but harmless)', () => {
      expect(injectMetadataId('FROM logs* | KEEP _*')).toBe(
        'FROM logs* METADATA _id | KEEP _*, _id'
      );
    });
  });

  describe('multiple KEEP commands', () => {
    it('injects _id into both KEEP commands', () => {
      expect(injectMetadataId('FROM logs* | KEEP a, b | KEEP a')).toBe(
        'FROM logs* METADATA _id | KEEP a, b, _id | KEEP a, _id'
      );
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
