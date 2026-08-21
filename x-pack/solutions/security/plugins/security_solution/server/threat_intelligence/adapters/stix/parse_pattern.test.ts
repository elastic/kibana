/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseStixPattern } from './parse_pattern';
import type { ExtractedIoc } from '../../services/extract_iocs';

// Minimal structural check — all required ExtractedIoc fields present.
const hasRequiredFields = (ioc: ExtractedIoc): boolean =>
  typeof ioc.type === 'string' &&
  typeof ioc.value === 'string' &&
  typeof ioc.tier === 'string' &&
  typeof ioc.tier_heuristic === 'string' &&
  typeof ioc.tier_basis === 'string';

// ── Single-comparison patterns ───────────────────────────────────────────────

describe('parseStixPattern — single-comparison patterns', () => {
  it('parses ipv4-addr:value', () => {
    const result = parseStixPattern("[ipv4-addr:value = '1.2.3.4']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'ip', value: '1.2.3.4' });
  });

  it('parses ipv6-addr:value', () => {
    const result = parseStixPattern("[ipv6-addr:value = '2001:db8::1']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'ip', value: '2001:db8::1' });
  });

  it('parses domain-name:value', () => {
    const result = parseStixPattern("[domain-name:value = 'evil.example.com']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'domain', value: 'evil.example.com' });
  });

  it('parses url:value', () => {
    const result = parseStixPattern("[url:value = 'https://evil.example.com/payload']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'url', value: 'https://evil.example.com/payload' });
  });

  it('parses email-addr:value', () => {
    const result = parseStixPattern("[email-addr:value = 'attacker@evil.example.com']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'email', value: 'attacker@evil.example.com' });
  });
});

// ── Hash variants ────────────────────────────────────────────────────────────

describe('parseStixPattern — hash variants', () => {
  it("parses file:hashes.'MD5' (quoted)", () => {
    const result = parseStixPattern("[file:hashes.'MD5' = 'aabbccddeeff00112233445566778899']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'hash', value: 'aabbccddeeff00112233445566778899' });
  });

  it('parses file:hashes.MD5 (unquoted)', () => {
    const result = parseStixPattern("[file:hashes.MD5 = 'AABBCCDDEEFF00112233445566778899']");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'hash', value: 'aabbccddeeff00112233445566778899' });
  });

  it("parses file:hashes.'SHA-1' (quoted, hyphenated)", () => {
    const result = parseStixPattern(
      "[file:hashes.'SHA-1' = 'da39a3ee5e6b4b0d3255bfef95601890afd80709']"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'hash',
      value: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    });
  });

  it("parses file:hashes.'SHA-256' (quoted, hyphenated)", () => {
    const result = parseStixPattern(
      "[file:hashes.'SHA-256' = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855']"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'hash',
      value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
  });

  it('parses file:hashes.SHA256 (no hyphen, no quotes) and lowercases', () => {
    const result = parseStixPattern(
      "[file:hashes.SHA256 = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855']"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'hash',
      value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
  });

  it('parses file:hashes.SHA1 (no hyphen)', () => {
    const result = parseStixPattern(
      "[file:hashes.SHA1 = 'da39a3ee5e6b4b0d3255bfef95601890afd80709']"
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'hash' });
  });
});

// ── Tiering ──────────────────────────────────────────────────────────────────

describe('parseStixPattern — tiering', () => {
  it('assigns discriminating tier to hashes', () => {
    const [ioc] = parseStixPattern("[file:hashes.MD5 = 'aabbccddeeff00112233445566778899']");
    expect(ioc.tier).toBe('discriminating');
    expect(ioc.tier_heuristic).toBe('discriminating');
    expect(ioc.tier_basis).toBe('stix_pattern');
  });

  it('assigns contextual tier to ip/domain/url/email', () => {
    const patterns = [
      "[ipv4-addr:value = '1.2.3.4']",
      "[domain-name:value = 'evil.example.com']",
      "[url:value = 'https://evil.example.com/']",
      "[email-addr:value = 'x@evil.example.com']",
    ];
    for (const p of patterns) {
      const [ioc] = parseStixPattern(p);
      expect(ioc.tier).toBe('contextual');
      expect(ioc.tier_heuristic).toBe('contextual');
      expect(ioc.tier_basis).toBe('stix_pattern');
    }
  });

  it('sets tier === tier_heuristic (no reassignment)', () => {
    const [ioc] = parseStixPattern("[ipv4-addr:value = '8.8.8.8']");
    expect(ioc.tier).toBe(ioc.tier_heuristic);
  });
});

// ── Multi-comparison patterns ─────────────────────────────────────────────────

describe('parseStixPattern — multi-comparison patterns', () => {
  it('extracts all IOCs from an OR pattern', () => {
    const result = parseStixPattern(
      "[ipv4-addr:value = '1.2.3.4'] OR [domain-name:value = 'evil.example.com']"
    );
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.type).sort()).toEqual(['domain', 'ip']);
  });

  it('extracts all IOCs from a bracketed AND pattern', () => {
    const result = parseStixPattern(
      "[ipv4-addr:value = '1.2.3.4' AND domain-name:value = 'evil.example.com']"
    );
    expect(result).toHaveLength(2);
  });

  it('extracts all supported IOCs from a mixed-type pattern', () => {
    const result = parseStixPattern(
      "[ipv4-addr:value = '1.2.3.4'] OR [file:hashes.MD5 = 'aabbccddeeff00112233445566778899'] OR [domain-name:value = 'c2.example.com']"
    );
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.type).sort()).toEqual(['domain', 'hash', 'ip']);
  });

  it('deduplicates identical (type, value) pairs within one pattern', () => {
    const result = parseStixPattern(
      "[ipv4-addr:value = '1.2.3.4'] OR [ipv4-addr:value = '1.2.3.4']"
    );
    expect(result).toHaveLength(1);
  });

  it('dedup is case-insensitive for hash values', () => {
    const result = parseStixPattern(
      "[file:hashes.MD5 = 'AABB1122'] OR [file:hashes.MD5 = 'aabb1122']"
    );
    // Both canonicalize to the same lowercase value → one record
    expect(result).toHaveLength(1);
  });
});

// ── Rejection cases ───────────────────────────────────────────────────────────

describe('parseStixPattern — rejection cases', () => {
  it('returns [] for yara pattern_type', () => {
    expect(parseStixPattern("[file:hashes.MD5 = 'aabb1122']", 'yara')).toEqual([]);
  });

  it('returns [] for snort pattern_type', () => {
    expect(parseStixPattern('alert tcp ...', 'snort')).toEqual([]);
  });

  it('returns [] for sigma pattern_type', () => {
    expect(parseStixPattern('title: Suspicious ...', 'sigma')).toEqual([]);
  });

  it('returns [] for pcre pattern_type', () => {
    expect(parseStixPattern('/evil.*/i', 'pcre')).toEqual([]);
  });

  it('skips unsupported object paths (file:name)', () => {
    const result = parseStixPattern("[file:name = 'payload.exe']");
    expect(result).toEqual([]);
  });

  it('skips unsupported object paths (process:pid)', () => {
    const result = parseStixPattern("[process:pid = '1234']");
    expect(result).toEqual([]);
  });

  it('skips unsupported object paths (windows-registry-key:key)', () => {
    const result = parseStixPattern("[windows-registry-key:key = 'HKLM\\\\Software\\\\Evil']");
    expect(result).toEqual([]);
  });

  it('skips LIKE comparisons (not a literal IOC)', () => {
    // LIKE uses a different syntax — no `= '...'` form, so it's simply not matched
    const result = parseStixPattern("[domain-name:value LIKE '%evil%']");
    expect(result).toEqual([]);
  });

  it('skips MATCHES comparisons', () => {
    const result = parseStixPattern("[domain-name:value MATCHES '^evil.*\\.com$']");
    expect(result).toEqual([]);
  });

  it('skips != comparisons', () => {
    const result = parseStixPattern("[ipv4-addr:value != '1.2.3.4']");
    expect(result).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(parseStixPattern('')).toEqual([]);
  });

  it('returns [] for malformed/unclosed bracket', () => {
    expect(parseStixPattern('[ipv4-addr:value = ')).toEqual([]);
  });

  it('tolerates null cast through (returns [])', () => {
    // Cast through — tolerant API
    expect(parseStixPattern(null as unknown as string)).toEqual([]);
  });

  it('tolerates undefined cast through (returns [])', () => {
    expect(parseStixPattern(undefined as unknown as string)).toEqual([]);
  });
});

// ── Canonicalization ──────────────────────────────────────────────────────────

describe('parseStixPattern — value canonicalization', () => {
  it('lowercases ip values', () => {
    // IPv6 hex digits
    const [ioc] = parseStixPattern("[ipv6-addr:value = '2001:DB8::1']");
    expect(ioc.value).toBe('2001:db8::1');
  });

  it('lowercases domain values', () => {
    const [ioc] = parseStixPattern("[domain-name:value = 'Evil.EXAMPLE.COM']");
    expect(ioc.value).toBe('evil.example.com');
  });

  it('lowercases email values', () => {
    const [ioc] = parseStixPattern("[email-addr:value = 'ATTACKER@EVIL.EXAMPLE.COM']");
    expect(ioc.value).toBe('attacker@evil.example.com');
  });

  it('lowercases hash values', () => {
    const [ioc] = parseStixPattern("[file:hashes.MD5 = 'AABB1122CCDD3344']");
    expect(ioc.value).toBe('aabb1122ccdd3344');
  });

  it('preserves URL case (path is case-sensitive)', () => {
    const url = 'https://evil.example.com/PAYLOAD/Stage2.exe';
    const [ioc] = parseStixPattern(`[url:value = '${url}']`);
    expect(ioc.value).toBe(url);
  });

  it('unescapes STIX backslash escape (\\\\)', () => {
    const [ioc] = parseStixPattern("[domain-name:value = 'evil\\\\example.com']");
    // \\\\ in STIX source → \\ in JS string → unescape → single \
    expect(ioc.value).toBe('evil\\example.com');
  });

  it("unescapes STIX single-quote escape (\\')", () => {
    const [ioc] = parseStixPattern("[domain-name:value = 'it\\'s.example.com']");
    expect(ioc.value).toBe("it's.example.com");
  });
});

// ── Structural integrity ──────────────────────────────────────────────────────

describe('parseStixPattern — structural integrity', () => {
  it('all records satisfy the ExtractedIoc shape', () => {
    const result = parseStixPattern(
      "[ipv4-addr:value = '1.2.3.4'] OR [file:hashes.MD5 = 'aabbccddeeff00112233445566778899']"
    );
    for (const ioc of result) {
      expect(hasRequiredFields(ioc)).toBe(true);
    }
  });

  it('does not set defanged field (STIX values are fanged/live)', () => {
    const result = parseStixPattern("[ipv4-addr:value = '1.2.3.4']");
    expect(result[0]).not.toHaveProperty('defanged');
  });

  it('does not set port field (STIX indicator patterns rarely carry socket form)', () => {
    const result = parseStixPattern("[ipv4-addr:value = '1.2.3.4']");
    expect(result[0]).not.toHaveProperty('port');
  });
});
