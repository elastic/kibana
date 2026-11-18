/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from './ip';

// The expected values are the answers of `net.isIP` of Node.js, which cannot be imported here because the code also runs in the browser
const CASES: Array<[string, 0 | 4 | 6]> = [
  ['', 0],
  ['0.0.0.0', 4],
  ['10.0.0.1', 4],
  ['255.255.255.255', 4],
  ['256.0.0.1', 0],
  ['1.2.3', 0],
  ['1.2.3.4.5', 0],
  ['01.1.1.1', 0],
  ['1.1.1.01', 0],
  ['-1.0.0.0', 0],
  [' 1.1.1.1', 0],
  ['1.1.1.1 ', 0],
  ['1.1.1.1/24', 0],
  ['::', 6],
  ['::1', 6],
  ['::ffff:10.0.0.1', 6],
  ['::ffff:1.2.3.256', 0],
  ['2001:db8::1', 6],
  ['2001:db8::', 6],
  ['2001:db8:0:0:0:0:0:1', 6],
  ['2001:db8:0:0:0:0:0:0:1', 0],
  ['2001:db8::1::2', 0],
  ['2001:0db8:85a3:0000:0000:8a2e:0370:7334', 6],
  ['12345::1', 0],
  ['g::1', 0],
  ['fe80::1%eth0', 6],
  ['fe80::1%', 0],
  ['fe80::1%eth0/64', 0],
  ['1::2:3:4:5:6:7', 6],
  ['1:2:3:4:5:6:7::', 6],
  ['::1:2:3:4:5:6:7', 6],
  ['1:2:3:4:5:6:1.2.3.4', 6],
  ['1:2:3:4:5:6:7:1.2.3.4', 0],
  ['bogus', 0],
  ['many', 0],
  ['1e3', 0],
  ['::/0', 0],
  ['10.0.0.0/33', 0],
];

describe('isIP', () => {
  it.each(CASES)('answers as net.isIP of Node.js does for %p', (value, expected) => {
    expect(isIP(value)).toBe(expected);
  });

  it('tells the version', () => {
    expect(isIP('10.0.0.1')).toBe(4);
    expect(isIP('2001:db8::1')).toBe(6);
    expect(isIP('bogus')).toBe(0);
  });
});
