/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asArrayIfExists, decodeIpv6, encodeIpv6 } from '.';

describe('Helpers', () => {
  describe('#encodeIpv6', () => {
    test('if it encodes the provided IPv6 by replacing : with -', () => {
      const encodedIp = encodeIpv6('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
      expect(encodedIp).toBe('2001-db8-ffff-ffff-ffff-ffff-ffff-ffff');
    });
  });

  describe('#decodeIpv6', () => {
    test('if it decodes the provided IPv6 by replacing - with :', () => {
      const decodedIp = decodeIpv6('2001-db8-ffff-ffff-ffff-ffff-ffff-ffff');
      expect(decodedIp).toBe('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
    });
  });

  describe('#asArrayIfExists', () => {
    const foo = {
      bar: 'baz',
    };

    test('it returns undefined when value is undefined', () => {
      expect(asArrayIfExists(undefined)).toBe(undefined);
    });

    test('it wraps null in an array when value is null', () => {
      expect(asArrayIfExists(null)).toEqual([null]);
    });

    test('it does NOT double-wrap when value is an array containing a null value', () => {
      expect(asArrayIfExists([null])).toEqual([null]);
    });

    test('it wraps scalar values in an array', () => {
      expect(asArrayIfExists('hello')).toEqual(['hello']);
    });

    test('it does NOT double-wrap when value is an array containing a scalar value', () => {
      expect(asArrayIfExists(['hello'])).toEqual(['hello']);
    });

    test('it wraps an object in an array', () => {
      expect(asArrayIfExists(foo)).toEqual([foo]);
    });

    test('it does NOT double-wrap when value is an array containing an object', () => {
      expect(asArrayIfExists([foo])).toEqual([foo]);
    });
  });
});
