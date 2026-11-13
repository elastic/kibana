/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Ordering } from '.';
import {
  compareDpkg,
  compareKeys,
  compareRpm,
  dpkgKey,
  parseDpkg,
  parseEvr,
  rpmKey,
  UnencodableVersionError,
} from '.';

interface LabelledPair {
  readonly a: string;
  readonly b: string;
  readonly expected: Ordering;
}

/*
 * Pairs labelled by the real tools (dpkg 1.22 / libapt for dpkg, librpm 4.16 labelCompare for
 * rpm) from Debian, Ubuntu, Fedora and AlmaLinux package versions. The fixture keeps every pair
 * that a digits-only comparator gets wrong, plus a 1-in-20 sample of the rest.
 */
const loadPairs = (scheme: 'dpkg' | 'rpm'): LabelledPair[] =>
  readFileSync(join(__dirname, '__fixtures__', `${scheme}_labelled_pairs.tsv`), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [a, b, expected] = line.split('\t');
      return { a, b, expected: Number(expected) as Ordering };
    });

const mismatches = (pairs: LabelledPair[], compare: (a: string, b: string) => number): string[] =>
  pairs
    .filter(({ a, b, expected }) => Math.sign(compare(a, b)) !== expected)
    .slice(0, 10)
    .map(({ a, b, expected }) => `${a} vs ${b}: expected ${expected}`);

describe('dpkg', () => {
  const pairs = loadPairs('dpkg');

  it('loads a non-trivial labelled corpus', () => {
    expect(pairs.length).toBeGreaterThan(1500);
  });

  it('compareDpkg agrees with dpkg on every labelled pair', () => {
    expect(mismatches(pairs, compareDpkg)).toEqual([]);
  });

  it('dpkgKey byte order agrees with dpkg on every labelled pair', () => {
    expect(mismatches(pairs, (a, b) => compareKeys(dpkgKey(a), dpkgKey(b)))).toEqual([]);
  });

  it.each([
    ['1:1.0', '2.0', 1],
    ['1.0~rc1', '1.0', -1],
    ['1.1.1k', '1.1.1l', -1],
    ['1.1.1f-1ubuntu2', '1.1.1f-1ubuntu2.16', -1],
    ['2.36-0ubuntu1~20.04', '2.36-0ubuntu1', -1],
    ['0:1.0', '1.0', 0],
    ['1.0', '1.0-0', 0],
    ['1.01', '1.1', 0],
  ] as const)('orders %s vs %s as %i', (a, b, expected) => {
    expect(compareDpkg(a, b)).toBe(expected);
    expect(compareKeys(dpkgKey(a), dpkgKey(b))).toBe(expected);
  });

  it('splits the revision at the last dash', () => {
    expect(parseDpkg('2:1.2-3-4ubuntu1')).toEqual({
      epoch: 2,
      upstream: '1.2-3',
      revision: '4ubuntu1',
    });
  });

  it('rejects characters the key cannot represent', () => {
    expect(() => dpkgKey('1.0_beta')).toThrow(UnencodableVersionError);
    expect(() => dpkgKey('-1:1.0')).toThrow(UnencodableVersionError);
  });
});

describe('rpm', () => {
  const pairs = loadPairs('rpm');

  it('loads a non-trivial labelled corpus', () => {
    expect(pairs.length).toBeGreaterThan(1000);
  });

  it('compareRpm agrees with rpm on every labelled pair', () => {
    expect(mismatches(pairs, compareRpm)).toEqual([]);
  });

  it('rpmKey byte order agrees with rpm on every labelled pair', () => {
    expect(mismatches(pairs, (a, b) => compareKeys(rpmKey(a), rpmKey(b)))).toEqual([]);
  });

  it.each([
    ['1:0.1-1', '0:9.9-1', 1],
    ['0:1.0-1.el9', '0:1.0-1.el9_2', -1],
    ['0:1.0-1.el9_2', '0:1.0-1.el9_10', -1],
    ['0:1.0^20230101-1', '0:1.0-1', 1],
    ['0:1.0^20230101-1', '0:1.0.1-1', -1],
    ['0:1.0~rc1-1', '0:1.0-1', -1],
    ['1.0a-1', '1.0-1', 1],
    ['1.0a-1', '1.0.1-1', -1],
  ] as const)('orders %s vs %s as %i', (a, b, expected) => {
    expect(compareRpm(a, b)).toBe(expected);
    expect(compareKeys(rpmKey(a), rpmKey(b))).toBe(expected);
  });

  it('parses EVR with and without epoch and release', () => {
    expect(parseEvr('1:2.3-4.el9')).toEqual({ epoch: 1, version: '2.3', release: '4.el9' });
    expect(parseEvr('2.3')).toEqual({ epoch: 0, version: '2.3', release: '' });
  });

  it('rejects numbers longer than the key length char can encode', () => {
    expect(() => rpmKey(`1.${'9'.repeat(79)}-1`)).toThrow(UnencodableVersionError);
    expect(() => rpmKey('-1:1.0-1')).toThrow(UnencodableVersionError);
  });
});
