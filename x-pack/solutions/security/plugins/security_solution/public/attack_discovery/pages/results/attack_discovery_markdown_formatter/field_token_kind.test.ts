/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  abbreviateFieldValue,
  ABBREVIATED_LENGTH,
  FIELD_TOKEN_KIND,
  getFieldTokenKind,
  getIconForKind,
  MIN_ABBREVIATE_LENGTH,
} from './field_token_kind';

const SHORT_VALUE = 'shortval';
const LONG_UUID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // 36 chars
const LONG_SHA256 =
  'a'.repeat(64); // 64-char hex string
const LONG_SHA1 = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'; // 40 chars
const LONG_HEX_64 = '0'.repeat(64);

describe('getFieldTokenKind', () => {
  describe('Rule 0 — non-string / whitespace / short value → DEFAULT', () => {
    it('returns DEFAULT for a number value', () => {
      expect(getFieldTokenKind('_id', 123)).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });

    it('returns DEFAULT for undefined', () => {
      expect(getFieldTokenKind('_id', undefined)).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });

    it('returns DEFAULT for a value with whitespace (multi-value token)', () => {
      expect(getFieldTokenKind('_id', 'a b')).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });

    it('returns DEFAULT for a value shorter than MIN_ABBREVIATE_LENGTH', () => {
      expect(SHORT_VALUE.length).toBeLessThan(MIN_ABBREVIATE_LENGTH);
      expect(getFieldTokenKind('_id', SHORT_VALUE)).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });
  });

  describe('Rule 1 — alert id fields', () => {
    it('returns ALERT_ID for _id', () => {
      expect(getFieldTokenKind('_id', LONG_UUID)).toBe(FIELD_TOKEN_KIND.ALERT_ID);
    });

    it('returns ALERT_ID for kibana.alert.uuid', () => {
      expect(getFieldTokenKind('kibana.alert.uuid', LONG_UUID)).toBe(FIELD_TOKEN_KIND.ALERT_ID);
    });
  });

  describe('Rule 2 — hash fields by name', () => {
    it('returns HASH for file.hash.sha256', () => {
      expect(getFieldTokenKind('file.hash.sha256', LONG_SHA256)).toBe(FIELD_TOKEN_KIND.HASH);
    });

    it('returns HASH for process.hash.md5', () => {
      expect(getFieldTokenKind('process.hash.md5', 'a'.repeat(32))).toBe(FIELD_TOKEN_KIND.HASH);
    });

    it('returns HASH for process.hash.sha1', () => {
      expect(getFieldTokenKind('process.hash.sha1', LONG_SHA1)).toBe(FIELD_TOKEN_KIND.HASH);
    });

    it('returns HASH for process.pe.imphash', () => {
      // imphash is under pe not hash, so HASH_FIELD_REGEX won't match. Falls to Rule 5 (long hex).
      expect(getFieldTokenKind('process.pe.imphash', LONG_SHA256)).toBe(FIELD_TOKEN_KIND.HASH);
    });

    it('does NOT classify a non-hash subfield under .hash.', () => {
      // 'process.hash.myfield' does not match HASH_FIELD_REGEX because 'myfield' is not a known algo
      expect(getFieldTokenKind('process.hash.myfield', LONG_SHA256)).toBe(FIELD_TOKEN_KIND.HASH); // falls through to Rule 5
    });
  });

  describe('Rule 3 — named opaque id fields', () => {
    it('returns OPAQUE_ID for process.entity_id', () => {
      expect(getFieldTokenKind('process.entity_id', LONG_UUID)).toBe(FIELD_TOKEN_KIND.OPAQUE_ID);
    });

    it('returns OPAQUE_ID for agent.id', () => {
      expect(getFieldTokenKind('agent.id', LONG_UUID)).toBe(FIELD_TOKEN_KIND.OPAQUE_ID);
    });

    it('returns OPAQUE_ID for kibana.alert.rule.uuid', () => {
      expect(getFieldTokenKind('kibana.alert.rule.uuid', LONG_UUID)).toBe(
        FIELD_TOKEN_KIND.OPAQUE_ID
      );
    });
  });

  describe('Rule 4 — id-suffix field name + opaque value', () => {
    it('returns OPAQUE_ID for an unlisted field ending in .id with a UUID value', () => {
      expect(getFieldTokenKind('my.custom.trace.id', LONG_UUID)).toBe(FIELD_TOKEN_KIND.OPAQUE_ID);
    });

    it('returns DEFAULT for an id-suffix field with a slash-containing path value', () => {
      expect(getFieldTokenKind('some.path.id', '/var/log/auth.log/etc')).toBe(
        FIELD_TOKEN_KIND.DEFAULT
      );
    });
  });

  describe('Rule 5 — long pure-hex value heuristic', () => {
    it('returns HASH for an unlisted field with a 64-char hex value', () => {
      expect(getFieldTokenKind('unknown.field', LONG_HEX_64)).toBe(FIELD_TOKEN_KIND.HASH);
    });

    it('returns DEFAULT for a 64-char hex value that is short (below MIN_ABBREVIATE_LENGTH) — impossible by definition', () => {
      // This just documents that the length gate runs first
      expect(getFieldTokenKind('unknown.field', 'abcdef12')).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });

    it('returns DEFAULT for a long hostname (not hex)', () => {
      expect(getFieldTokenKind('host.name', 'very-long-hostname-that-is-not-hexadecimal-chars')).toBe(
        FIELD_TOKEN_KIND.DEFAULT
      );
    });

    it('returns DEFAULT for a file path', () => {
      expect(
        getFieldTokenKind('file.path', '/very/long/path/that/is/quite/long/indeed/file.exe')
      ).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });
  });

  describe('field names that should NOT be abbreviated', () => {
    it('returns DEFAULT for host.name with a short hostname', () => {
      expect(getFieldTokenKind('host.name', 'workstation-1')).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });

    it('returns DEFAULT for process.command_line (whitespace in value)', () => {
      expect(getFieldTokenKind('process.command_line', '/bin/sh -c "echo hello world"')).toBe(
        FIELD_TOKEN_KIND.DEFAULT
      );
    });

    it('returns DEFAULT for user.name', () => {
      expect(getFieldTokenKind('user.name', 'administrator')).toBe(FIELD_TOKEN_KIND.DEFAULT);
    });
  });
});

describe('abbreviateFieldValue', () => {
  it('abbreviates a long value to 8 chars + ellipsis', () => {
    const result = abbreviateFieldValue(LONG_UUID);
    expect(result).toBe(`${LONG_UUID.slice(0, ABBREVIATED_LENGTH)}…`);
    expect(result.length).toBe(ABBREVIATED_LENGTH + 1); // 8 chars + 1 ellipsis char
  });

  it('returns the original value when it is too short to bother abbreviating', () => {
    const short = '1a2b3c4d56'; // 10 chars — within ABBREVIATED_LENGTH + 4 = 12
    expect(abbreviateFieldValue(short)).toBe(short);
  });

  it('returns the original value when it is exactly at the no-abbreviate boundary', () => {
    const atBoundary = '1'.repeat(ABBREVIATED_LENGTH + 4); // exactly the cutoff
    expect(abbreviateFieldValue(atBoundary)).toBe(atBoundary);
  });

  it('abbreviates when value length exceeds the boundary by one', () => {
    const justOver = '1'.repeat(ABBREVIATED_LENGTH + 5);
    expect(abbreviateFieldValue(justOver)).toContain('…');
  });
});

describe('getIconForKind', () => {
  it('returns "warning" for ALERT_ID', () => {
    expect(getIconForKind('_id', FIELD_TOKEN_KIND.ALERT_ID)).toBe('warning');
  });

  it('returns "key" for HASH', () => {
    expect(getIconForKind('file.hash.sha256', FIELD_TOKEN_KIND.HASH)).toBe('key');
  });

  it('returns "tag" for OPAQUE_ID', () => {
    expect(getIconForKind('agent.id', FIELD_TOKEN_KIND.OPAQUE_ID)).toBe('tag');
  });

  it('returns "" for DEFAULT', () => {
    expect(getIconForKind('host.name', FIELD_TOKEN_KIND.DEFAULT)).toBe('');
  });
});
