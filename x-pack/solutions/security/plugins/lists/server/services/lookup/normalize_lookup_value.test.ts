/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-list-types';

import { canonicalLookupValue, normalizeLookupValue } from './normalize_lookup_value';
import { lookupItemId } from './write_lookup_items';

const canonical = (type: Type, value: string): string => {
  const result = canonicalLookupValue(type, value);
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result.value;
};
const rejected = (type: Type, value: string): boolean => !canonicalLookupValue(type, value).ok;

describe('canonicalLookupValue', () => {
  describe('ip', () => {
    it('accepts dotted IPv4 as authored', () => {
      expect(canonical('ip', '1.2.3.4')).toBe('1.2.3.4');
      expect(canonical('ip', ' 1.2.3.4 ')).toBe('1.2.3.4');
    });

    it('gives every spelling of an IPv6 address the same form', () => {
      expect(canonical('ip', '0:0:0:0:0:0:0:1')).toBe('::1');
      expect(canonical('ip', '2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
      expect(canonical('ip', '2001:DB8::1')).toBe('2001:db8::1');
    });

    it('maps an IPv4-mapped IPv6 address, in either spelling, to its IPv4 form', () => {
      expect(canonical('ip', '::ffff:1.2.3.4')).toBe('1.2.3.4');
      expect(canonical('ip', '::FFFF:1.2.3.4')).toBe('1.2.3.4');
      expect(canonical('ip', '::ffff:102:304')).toBe('1.2.3.4');
      expect(canonical('ip', '0:0:0:0:0:ffff:102:304')).toBe('1.2.3.4');
    });

    it('rejects spellings Elasticsearch rejects or stores differently', () => {
      // ipaddr.js would read these as 1.2.0.3, 8.0.0.1, 127.0.0.1, and 1.2.3.4
      for (const spelling of ['1.2.3', '010.0.0.1', '0x7f.0.0.1', '::1.2.3.4']) {
        expect(rejected('ip', spelling)).toBe(true);
      }
      // Elasticsearch strips the zone id; the id must not carry it
      expect(rejected('ip', 'fe80::1%eth0')).toBe(true);
      expect(rejected('ip', '::ffff:010.0.0.1')).toBe(true);
      expect(rejected('ip', 'not-an-ip')).toBe(true);
      expect(rejected('ip', '2001:db8::12345')).toBe(true);
    });
  });

  describe('integers', () => {
    it('collapses every spelling of one integer', () => {
      for (const spelling of [
        '1',
        '01',
        '+1',
        '1.0',
        '1.00',
        ' 1 ',
        '1e0',
        '0.1e1',
        '10e-1',
        '1.',
      ]) {
        expect(canonical('long', spelling)).toBe('1');
      }
      expect(canonical('integer', '-007')).toBe('-7');
      expect(canonical('short', '-0')).toBe('0');
      expect(canonical('long', '1e3')).toBe('1000');
      expect(canonical('long', '1.5E2')).toBe('150');
    });

    it('keeps the full precision of a long', () => {
      expect(canonical('long', '9007199254740993')).toBe('9007199254740993');
      expect(canonical('long', '9223372036854775807')).toBe('9223372036854775807');
      expect(canonical('long', '-9223372036854775808')).toBe('-9223372036854775808');
    });

    it('rejects a non-zero fraction, since Elasticsearch truncates or rounds it by type', () => {
      expect(rejected('long', '1.9')).toBe(true);
      expect(rejected('integer', '1.99999999999999999')).toBe(true);
      expect(rejected('byte', '0.5')).toBe(true);
      expect(rejected('long', '15e-1')).toBe(true);
    });

    it('rejects values out of the type range and values that are not numbers', () => {
      expect(rejected('byte', '128')).toBe(true);
      expect(rejected('short', '32768')).toBe(true);
      expect(rejected('integer', '2147483648')).toBe(true);
      expect(rejected('long', '9223372036854775808')).toBe(true);
      expect(rejected('long', '1e30')).toBe(true);
      for (const spelling of ['abc', '.', '1d', '1f', 'NaN', 'Infinity', '']) {
        expect(rejected('long', spelling)).toBe(true);
      }
    });
  });

  describe('floating point', () => {
    it('collapses every spelling of one double', () => {
      for (const spelling of ['1', '1.0', '1.00', '+1', '1e0', ' 1 ']) {
        expect(canonical('double', spelling)).toBe('1');
      }
      expect(canonical('double', '0.10')).toBe('0.1');
      expect(canonical('double', '-2.50')).toBe('-2.5');
    });

    it('keeps negative zero apart from zero, as Elasticsearch does', () => {
      for (const type of ['double', 'float', 'half_float'] as const) {
        expect(canonical(type, '-0')).toBe('-0');
        expect(canonical(type, '-0.0')).toBe('-0');
        expect(canonical(type, '0')).toBe('0');
        expect(canonical(type, '+0.0')).toBe('0');
      }
      expect(canonical('float', '-1e-46')).toBe('-0');
      expect(canonical('half_float', '-1e-8')).toBe('-0');
    });

    it('rounds a float to single precision', () => {
      expect(canonical('float', '0.1')).toBe(canonical('float', '0.100000001490116'));
      expect(canonical('double', '0.1')).not.toBe(canonical('double', '0.100000001490116'));
      expect(canonical('float', '16777217')).toBe('16777216');
      expect(canonical('float', '1e-46')).toBe('0');
      expect(canonical('float', '3.4028235e38')).toBe('3.4028234663852886e+38');
    });

    it('rounds decimal text to float exactly, where a double round trip would be off by one unit', () => {
      // each lies within half a double unit of a float midpoint; Float.parseFloat gives the
      // upper float, Math.fround(Number(text)) the lower one
      expect(canonical('float', '1.62696772813797')).toBe('1.6269677877426147');
      expect(String(Math.fround(Number('1.62696772813797')))).toBe('1.6269676685333252');
      expect(canonical('float', '1.0000000596046447753906250000000000008673')).toBe(
        '1.0000001192092896'
      );
      // parses to the float 1 + 2^-11, the exact tie between 1 and 1.0009765625, so the half
      // rounding goes to even: 1. A direct double-to-half rounding would give 1.0009765625.
      expect(canonical('half_float', '1.0004882812509313225746154785156250')).toBe('1');
    });

    it('rounds a half_float through float to half precision, as Elasticsearch does', () => {
      // 1 + 2^-11 is halfway between 1 and the next half value 1 + 2^-10; ties go to even
      expect(canonical('half_float', '1.00048828125')).toBe('1');
      expect(canonical('half_float', '1.0005')).toBe('1.0009765625');
      expect(canonical('half_float', '0.1')).toBe(canonical('half_float', '0.0999755859375'));
      expect(canonical('half_float', '0')).toBe('0');
      // above the largest half value, Elasticsearch stores 65504 up to the rounding edge
      expect(canonical('half_float', '65510')).toBe('65504');
      expect(rejected('half_float', '65520')).toBe(true);
    });

    it('rounds a double exactly, with any number of digits', () => {
      expect(canonical('double', '1.0000000596046447753906250000000000008673')).toBe(
        '1.0000000596046448'
      );
      expect(canonical('double', '0.1000000000000000055511151231257827021181583404541015625')).toBe(
        '0.1'
      );
    });

    it('rejects values that are not finite numbers', () => {
      for (const spelling of ['abc', '', 'NaN', 'Infinity', '1e400']) {
        expect(rejected('double', spelling)).toBe(true);
      }
      expect(rejected('float', '1e39')).toBe(true);
      expect(rejected('float', '3.4028236e38')).toBe(true);
    });
  });

  describe('boolean', () => {
    it('accepts exactly true and false', () => {
      expect(canonical('boolean', 'true')).toBe('true');
      expect(canonical('boolean', ' false ')).toBe('false');
      expect(rejected('boolean', 'TRUE')).toBe(true);
      expect(rejected('boolean', 'yes')).toBe(true);
    });
  });

  describe('dates', () => {
    it('collapses every spelling of one date instant to ISO 8601 UTC', () => {
      for (const spelling of [
        '2020-01-01',
        '2020-01-01T00:00',
        '2020-01-01T00:00:00',
        '2020-01-01T00:00:00Z',
        '2020-01-01T00:00:00.000Z',
        '2020-01-01T00:00:00,000Z',
        '2020-01-01T01:00:00+01:00',
        '2020-01-01T01:00:00+0100',
        '2020-01-01T01:00:00+01',
        '1577836800000',
      ]) {
        expect(canonical('date', spelling)).toBe('2020-01-01T00:00:00.000Z');
      }
      expect(canonical('date', '2020-01-01T00:00:00.1234Z')).toBe('2020-01-01T00:00:00.123Z');
    });

    it('keeps the authored fraction of a date_nanos', () => {
      expect(canonical('date_nanos', '2020-01-01T00:00:00.123456789Z')).toBe(
        '2020-01-01T00:00:00.123456789Z'
      );
      expect(canonical('date_nanos', '2020-01-01T00:00:00,123456000Z')).toBe(
        '2020-01-01T00:00:00.123456Z'
      );
      expect(canonical('date_nanos', '2020-01-01')).toBe('2020-01-01T00:00:00Z');
      expect(canonical('date_nanos', '2020-01-01T01:00:00.5+01:00')).toBe('2020-01-01T00:00:00.5Z');
      expect(canonical('date_nanos', '1577836800500')).toBe('2020-01-01T00:00:00.5Z');
      expect(canonical('date_nanos', '1577836800000')).toBe('2020-01-01T00:00:00Z');
    });

    it.each([
      '2020',
      '2020-01',
      '20200101',
      '2020-01-01 00:00:00',
      '2020-01-01T24:00:00',
      '2020-01-01T00:00:00UTC',
      '2020-01-01T01:00:00Europe/Paris',
      '2020-W01-3',
      '2020-001',
      '2020-02-30',
      '1577836800000.5',
      '2020-01-01T00:00:00+19:00',
      '2020-01-01T00:00:00-18:30',
      'yesterday',
    ])('rejects "%s", a spelling that would be guessed rather than parsed', (spelling) => {
      expect(rejected('date', spelling)).toBe(true);
    });

    it('keeps an epoch beyond the JavaScript date range as its digits, as Elasticsearch stores it', () => {
      // Elasticsearch stores these as two instants in the year 287396, one millisecond apart
      expect(canonical('date', '9007199254740992')).toBe('9007199254740992');
      expect(canonical('date', '9007199254740993')).toBe('9007199254740993');
      expect(canonical('date', '09007199254740992')).toBe('9007199254740992');
      expect(canonical('date', '-8640000000000001')).toBe('-8640000000000001');
      // the last millisecond a JavaScript date represents still formats as an instant
      expect(canonical('date', '8640000000000000')).toBe('+275760-09-13T00:00:00.000Z');
    });

    it('rejects an epoch beyond what Elasticsearch stores for the type', () => {
      expect(rejected('date', '9223372036854775808')).toBe(true); // past a signed 64-bit number
      expect(rejected('date_nanos', '9223372036855')).toBe(true); // past 2262, the date_nanos span
      expect(canonical('date_nanos', '9223372036854')).toBe('2262-04-11T23:47:16.854Z');
    });
  });

  describe('other types', () => {
    it('trims and otherwise keeps the authored value', () => {
      expect(canonical('keyword', ' Abc ')).toBe('Abc');
      expect(canonical('keyword', '0:0:0:0:0:0:0:1')).toBe('0:0:0:0:0:0:0:1');
      expect(canonical('text', 'some words')).toBe('some words');
      expect(canonical('ip_range', '10.0.0.0/24')).toBe('10.0.0.0/24');
      expect(canonical('geo_point', 'POINT (1 2)')).toBe('POINT (1 2)');
    });

    it('spells a geo value the way a read returns it, so the id survives a round trip', () => {
      // `lat,lon` on a geo_point is stored as an object and read back as `lat,lon`
      expect(canonical('geo_point', ' 41.12 , -71.34 ')).toBe('41.12,-71.34');
      expect(canonical('geo_point', '41.12,-71.34')).toBe('41.12,-71.34');
      // `lat,lon` on a shape type is stored and read back as the WKT point the serializer builds
      expect(canonical('geo_shape', '41.12, -71.34')).toBe('POINT (-71.34 41.12)');
      expect(canonical('shape', '41.12,-71.34')).toBe('POINT (-71.34 41.12)');
      // WKT is stored and read back as authored, trimmed
      expect(canonical('geo_shape', ' POINT (-71.34 41.12) ')).toBe('POINT (-71.34 41.12)');
      expect(canonical('geo_point', 'POINT (-71.34 41.12)')).toBe('POINT (-71.34 41.12)');
    });

    it('rejects empty values and line breaks, which the shared stream stores truncated', () => {
      expect(rejected('keyword', '')).toBe(true);
      expect(rejected('keyword', '  ')).toBe(true);
      expect(rejected('keyword', 'a\nb')).toBe(true);
      expect(rejected('text', 'a\r\nb')).toBe(true);
    });
  });
});

describe('normalizeLookupValue and lookupItemId', () => {
  it('gives two accepted spellings of one value the same document id', () => {
    expect(lookupItemId('ip', '::1', 'l')).toBe(lookupItemId('ip', '0:0:0:0:0:0:0:1', 'l'));
    expect(lookupItemId('long', '1', 'l')).toBe(lookupItemId('long', '1.0', 'l'));
    expect(lookupItemId('date', '2020-01-01', 'l')).toBe(
      lookupItemId('date', '1577836800000', 'l')
    );
    expect(lookupItemId('keyword', '1', 'l')).not.toBe(lookupItemId('keyword', '1.0', 'l'));
  });

  it('gives the same value in two lists two document ids', () => {
    expect(lookupItemId('ip', '9.9.9.9', 'list-a')).not.toBe(
      lookupItemId('ip', '9.9.9.9', 'list-b')
    );
  });

  it('falls back to the trimmed authored spelling for a rejected value', () => {
    expect(normalizeLookupValue('ip', ' not-an-ip ')).toBe('not-an-ip');
  });
});
