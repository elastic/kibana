/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  compareKeys,
  compareWindowsBuild,
  parseWindowsBuild,
  UnencodableVersionError,
  windowsBuildKey,
} from '.';

describe('windows_build', () => {
  const installed = '10.0.19045.7846';

  it.each([
    ['10.0.19045.7846', '10.0.19045.7548', 1],
    ['10.0.19045.7846', '10.0.19045.7846', 0],
    ['10.0.19045.7846', '10.0.19045.7847', -1],
    ['10.0.19045.999', '10.0.19045.7846', -1],
    ['10.0.19045.7846', '10.0.19045.999', 1],
    ['10.0.19045.7846', '10.0.22631.1', -1],
    ['10.0.26100.9974', '10.0.26100.33822', -1],
  ] as const)('compares %s with %s as %i', (a, b, expected) => {
    expect(compareWindowsBuild(a, b)).toBe(expected);
  });

  it('orders the ubr numerically, not lexically', () => {
    expect(compareWindowsBuild('10.0.19045.999', installed)).toBe(-1);
    expect(
      ['10.0.19045.7846', '10.0.19045.999', '10.0.19045.7548'].sort(compareWindowsBuild)
    ).toEqual(['10.0.19045.999', '10.0.19045.7548', '10.0.19045.7846']);
  });

  it('builds a key whose byte order equals the comparator order', () => {
    const versions = [
      '10.0.19045.1',
      '10.0.19045.999',
      '10.0.19045.7548',
      '10.0.19045.7846',
      '10.0.19045.7847',
      '10.0.19045.10000',
      '10.0.22631.1',
      '10.0.26100.9974',
      '10.0.26100.33822',
    ];
    for (const a of versions) {
      for (const b of versions) {
        expect(compareKeys(windowsBuildKey(a), windowsBuildKey(b))).toBe(compareWindowsBuild(a, b));
      }
    }
  });

  it('parses the four components', () => {
    expect(parseWindowsBuild(' 10.0.19045.7846 ')).toEqual({
      major: 10,
      minor: 0,
      build: 19045,
      ubr: 7846,
    });
  });

  it.each(['', '10.0.19045', '10.0.19045.', '10.0.19045.x', '10.0.19045.7846.1', '10.0.-1.5'])(
    'rejects %p instead of guessing an order',
    (raw) => {
      expect(() => parseWindowsBuild(raw)).toThrow(UnencodableVersionError);
      expect(() => windowsBuildKey(raw)).toThrow(UnencodableVersionError);
    }
  );
});
