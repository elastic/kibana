/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  djb2,
  deterministicFloat,
  pickFrom,
  shiftTimestamp,
  detectWindowsOs,
  rewriteIdLike,
  rewriteIds,
  variate,
} from '../evals/seed_data_from_scratch';

describe('seed_data_from_scratch', () => {
  describe('djb2', () => {
    it('returns consistent hash for identical input', () => {
      expect(djb2('test')).toBe(djb2('test'));
    });

    it('returns different hashes for different inputs', () => {
      expect(djb2('foo')).not.toBe(djb2('bar'));
    });

    it('returns a non-negative 32-bit number', () => {
      const h = djb2('anything');
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    });
  });

  describe('deterministicFloat', () => {
    it('returns a number between 0 and 1', () => {
      const f = deterministicFloat('seed');
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    });

    it('returns consistent value for identical seed', () => {
      expect(deterministicFloat('seed')).toBe(deterministicFloat('seed'));
    });

    it('returns different values for different seeds', () => {
      expect(deterministicFloat('a')).not.toBe(deterministicFloat('b'));
    });
  });

  describe('pickFrom', () => {
    it('returns an element from the array', () => {
      const arr = ['a', 'b', 'c'];
      expect(arr).toContain(pickFrom(arr, 'seed'));
    });

    it('is deterministic', () => {
      const arr = ['a', 'b', 'c'];
      expect(pickFrom(arr, 'seed')).toBe(pickFrom(arr, 'seed'));
    });

    it('uses the full range of the array', () => {
      const arr = Array.from({ length: 100 }, (_, i) => i);
      const picks = new Set<number>();
      for (let i = 0; i < 200; i++) {
        picks.add(pickFrom(arr, `seed:${i}`));
      }
      expect(picks.size).toBeGreaterThan(1);
      picks.forEach((p) => expect(arr).toContain(p));
    });
  });

  describe('shiftTimestamp', () => {
    it('shifts a valid ISO timestamp', () => {
      const base = '2024-01-01T00:00:00.000Z';
      const shifted = shiftTimestamp(base, 3600000); // +1 hour
      expect(shifted).toBe('2024-01-01T01:00:00.000Z');
    });

    it('handles negative deltas', () => {
      const base = '2024-01-01T12:00:00.000Z';
      const shifted = shiftTimestamp(base, -3600000);
      expect(shifted).toBe('2024-01-01T11:00:00.000Z');
    });

    it('returns the original input when unparsable', () => {
      expect(shiftTimestamp('not-a-date', 1000)).toBe('not-a-date');
    });
  });

  describe('detectWindowsOs', () => {
    it('detects windows from winlog field', () => {
      expect(
        detectWindowsOs({ winlog: { provider_name: 'Microsoft-Windows-Security-Auditing' } })
      ).toBe(true);
    });

    it('detects windows from .exe path', () => {
      expect(detectWindowsOs({ process: { executable: 'C:\\Windows\\notepad.exe' } })).toBe(true);
    });

    it('detects windows from C:\\ prefix', () => {
      expect(detectWindowsOs({ process: { executable: 'C:\\temp\\foo.bat' } })).toBe(true);
    });

    it('detects windows from host.os.Ext.variant', () => {
      expect(detectWindowsOs({ host: { os: { Ext: { variant: 'Windows 10' } } } })).toBe(true);
    });

    it('returns false for linux-like docs', () => {
      expect(detectWindowsOs({ process: { executable: '/usr/bin/bash' } })).toBe(false);
    });

    it('returns false for empty doc', () => {
      expect(detectWindowsOs({})).toBe(false);
    });
  });

  describe('rewriteIdLike', () => {
    it('rewrites hex-like strings', () => {
      const original = 'abcd1234efgh5678';
      const rewritten = rewriteIdLike(original, 'salt');
      expect(rewritten).not.toBe(original);
      expect(rewritten.startsWith('abcd')).toBe(true);
      expect(rewritten.endsWith('5678')).toBe(true);
    });

    it('rewrites base64-like strings', () => {
      const original = 'YWJjZGVmZ2hpamts';
      const rewritten = rewriteIdLike(original, 'salt');
      expect(rewritten).not.toBe(original);
    });

    it('leaves short strings unchanged', () => {
      expect(rewriteIdLike('short', 'salt')).toBe('short');
    });
  });

  describe('rewriteIds', () => {
    it('rewrites entity_id and id fields', () => {
      const obj = { entity_id: 'abcd12345678efgh', other: 'keep' };
      const result = rewriteIds(obj, 'salt') as Record<string, unknown>;
      expect(result.entity_id).not.toBe('abcd12345678efgh');
      expect(result.other).toBe('keep');
    });

    it('recurses into nested objects', () => {
      const obj = { nested: { id: 'aaaa0000bbbb1111' } };
      const result = rewriteIds(obj, 'salt') as Record<string, unknown>;
      expect((result.nested as Record<string, unknown>).id).not.toBe('aaaa0000bbbb1111');
    });

    it('handles arrays', () => {
      const obj = { ids: ['hex12345678901234', 'hex12345678901235'] };
      const result = rewriteIds(obj, 'salt') as Record<string, unknown>;
      const ids = result.ids as string[];
      expect(ids[0]).not.toBe('hex12345678901234');
      expect(ids[1]).not.toBe('hex12345678901235');
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('preserves primitives', () => {
      expect(rewriteIds(42, 's')).toBe(42);
      expect(rewriteIds(null, 's')).toBe(null);
      expect(rewriteIds('plain', 's')).toBe('plain');
    });
  });

  describe('variate', () => {
    it('clones the original without mutation', () => {
      const original = { '@timestamp': '2024-01-01T00:00:00Z', host: { name: 'static' } };
      const clone = variate(original, 0, Date.now(), 1000);
      expect(clone).not.toBe(original);
      expect(original).toEqual({ '@timestamp': '2024-01-01T00:00:00Z', host: { name: 'static' } });
    });

    it('shifts timestamp deterministically', () => {
      const original = { '@timestamp': '2024-01-01T00:00:00Z' };
      const a = variate(original, 1, Date.now(), 1000);
      expect(a['@timestamp']).not.toBe(original['@timestamp']);
      const b = variate(original, 1, Date.now(), 1000);
      expect(a['@timestamp']).toBe(b['@timestamp']);
    });

    it('injects host name and user name', () => {
      const original = {};
      const clone = variate(original, 0, Date.now(), 1000);
      expect(clone.host).toBeDefined();
      expect((clone.host as Record<string, unknown>).name).toBeDefined();
      expect(clone.user).toBeDefined();
      expect((clone.user as Record<string, unknown>).name).toBeDefined();
    });

    it('injects agent id', () => {
      const clone = variate({}, 0, Date.now(), 1000);
      expect(clone.agent).toBeDefined();
      expect(((clone.agent as Record<string, unknown>).id as string).startsWith('agent-')).toBe(
        true
      );
    });

    it('injects host.os.type when missing', () => {
      const clone = variate({}, 0, Date.now(), 1000);
      expect((clone.host as Record<string, unknown>).os).toBeDefined();
      expect(((clone.host as Record<string, unknown>).os as Record<string, unknown>).type).toMatch(
        /windows|linux/
      );
    });

    it('detects windows from .exe path', () => {
      const clone = variate({ process: { executable: 'C:\\\\\test.exe' } }, 0, Date.now(), 1000);
      expect(((clone.host as Record<string, unknown>).os as Record<string, unknown>).type).toBe(
        'windows'
      );
    });

    it('leaves existing host.os.type untouched', () => {
      const original = { host: { os: { type: 'macos' } } };
      const clone = variate(original, 0, Date.now(), 1000);
      expect(((clone.host as Record<string, unknown>).os as Record<string, unknown>).type).toBe(
        'macos'
      );
    });

    it('rewrites id-like fields', () => {
      const original = { entity_id: 'abcd123456789012' };
      const clone = variate(original, 0, Date.now(), 1000);
      expect(clone.entity_id).not.toBe('abcd123456789012');
    });
  });
});
