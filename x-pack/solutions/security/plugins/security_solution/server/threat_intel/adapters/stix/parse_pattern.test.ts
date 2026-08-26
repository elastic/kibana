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
      "[file:hashes.MD5 = 'AABB1122CCDD3344EEFF5566778899AA'] OR [file:hashes.MD5 = 'aabb1122ccdd3344eeff5566778899aa']"
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
    const [ioc] = parseStixPattern("[file:hashes.MD5 = 'AABB1122CCDD3344EEFF5566778899AA']");
    expect(ioc.value).toBe('aabb1122ccdd3344eeff5566778899aa');
  });

  it('preserves URL case (path is case-sensitive)', () => {
    const url = 'https://evil.example.com/PAYLOAD/Stage2.exe';
    const [ioc] = parseStixPattern(`[url:value = '${url}']`);
    expect(ioc.value).toBe(url);
  });

  it('unescapes STIX backslash escape (\\\\)', () => {
    const [ioc] = parseStixPattern("[url:value = 'https://evil.test/a\\\\b']");
    // \\\\ in STIX source → \\ in JS string → unescape → single \
    expect(ioc.value).toBe('https://evil.test/a\\b');
  });

  it("unescapes STIX single-quote escape (\\')", () => {
    const [ioc] = parseStixPattern("[url:value = 'https://evil.test/it\\'s']");
    expect(ioc.value).toBe("https://evil.test/it's");
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

// ── Value validation and address tiering ─────────────────────────────────────

describe('parseStixPattern — value validation', () => {
  // The object path is the only thing establishing the type, so a feed can put
  // anything on the right-hand side and it used to be taken at face value.
  it('rejects a hash whose length does not match the declared algorithm', () => {
    // 8 chars declared as MD5. This used to be emitted as a discriminating hash
    // and then filed under sha256 by the promote task's length fallback.
    expect(parseStixPattern("[file:hashes.MD5 = 'AABB1122']")).toEqual([]);
  });

  it('rejects a hash containing non-hex characters', () => {
    expect(parseStixPattern("[file:hashes.MD5 = 'zzbb1122ccdd3344eeff5566778899aa']")).toEqual([]);
  });

  it('accepts a correctly sized sha-256', () => {
    const [ioc] = parseStixPattern(
      "[file:hashes.'SHA-256' = '44a2ab4206fc5d5d33974adbc3fd2a80966e7a88167914794f524fa29a3d8e8e']"
    );
    expect(ioc.type).toBe('hash');
    expect(ioc.tier).toBe('discriminating');
  });

  // An ipv4-addr value that is not an address reaches an ES `ip` field, which is a
  // permanent item-level rejection rather than merely a bad row.
  it('rejects an ipv4-addr value that is not an address', () => {
    expect(parseStixPattern("[ipv4-addr:value = 'not-an-ip']")).toEqual([]);
  });

  it.each([
    ['no dot at all', 'notadomain'],
    ['empty label', 'evil..example.com'],
    ['numeric TLD', 'evil.example.123'],
    ['trailing hyphen label', 'evil-.example.com'],
  ])('rejects a domain that cannot resolve (%s)', (_label, value) => {
    expect(parseStixPattern(`[domain-name:value = '${value}']`)).toEqual([]);
  });

  it('rejects a url with a non-http scheme', () => {
    expect(parseStixPattern("[url:value = 'file:///etc/passwd']")).toEqual([]);
  });

  it('rejects an email that is not an address', () => {
    expect(parseStixPattern("[email-addr:value = 'nope']")).toEqual([]);
  });
});

describe('parseStixPattern — private and reserved addresses', () => {
  // `contextual` is promotable, so these used to become live Indicator Match rows
  // matching essentially all internal traffic.
  it.each([
    ['RFC1918', '10.0.0.1'],
    ['loopback', '127.0.0.1'],
    ['link-local', '169.254.169.254'],
    ['IPv6 loopback', '::1'],
    ['IPv6 unique-local', 'fc00::1'],
  ])('tiers %s as reference rather than contextual', (_label, value) => {
    const [ioc] = parseStixPattern(`[ipv4-addr:value = '${value}']`);
    expect(ioc.tier).toBe('reference');
    expect(ioc.tier_basis).toBe('private_ip');
  });

  it('leaves a public address contextual', () => {
    const [ioc] = parseStixPattern("[ipv4-addr:value = '185.220.101.45']");
    expect(ioc.tier).toBe('contextual');
    expect(ioc.tier_basis).toBe('stix_pattern');
  });
});
