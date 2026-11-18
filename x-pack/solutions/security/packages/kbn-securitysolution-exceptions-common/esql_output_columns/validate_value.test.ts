/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_WILDCARD_LENGTH,
  getInvalidValueReason,
  isBooleanValue,
  isIpOrCidrValue,
  isIpValue,
  isVersionValue,
  parseDateValue,
  parseIntegerValue,
  toLikePattern,
} from './validate_value';

describe('parseIntegerValue', () => {
  it.each([
    ['integer', '2147483647', BigInt('2147483647')],
    ['integer', '-2147483648', BigInt('-2147483648')],
    ['integer', '+7', BigInt(7)],
    ['long', '9223372036854775807', BigInt('9223372036854775807')],
    ['unsigned_long', '18446744073709551615', BigInt('18446744073709551615')],
    ['unsigned_long', '0', BigInt(0)],
  ] as const)('reads %s %s', (type, value, expected) => {
    expect(parseIntegerValue(value, type)).toBe(expected);
  });

  it.each([
    ['integer', '2147483648'],
    ['integer', '-2147483649'],
    ['long', '9223372036854775808'],
    ['unsigned_long', '-1'],
    ['unsigned_long', '18446744073709551616'],
    ['integer', '1e3'],
    ['integer', '0x10'],
    ['integer', '1.5'],
    ['integer', ''],
    ['integer', ' 1'],
    ['long', 'abc'],
  ] as const)('rejects %s %p', (type, value) => {
    expect(parseIntegerValue(value, type)).toBeUndefined();
  });
});

describe('other scalar values', () => {
  it('accepts true and false only', () => {
    expect(isBooleanValue('true')).toBe(true);
    expect(isBooleanValue('false')).toBe(true);
    expect(isBooleanValue('maybe')).toBe(false);
    expect(isBooleanValue('True')).toBe(false);
  });

  it.each(['10.0.0.1', '::1', '2001:db8::ff00:42:8329', '::ffff:10.0.0.1', 'fe80::1%eth0'])(
    'accepts the ip %s',
    (value) => {
      expect(isIpValue(value)).toBe(true);
    }
  );

  it.each(['bogus', '256.0.0.1', '10.0.0', '10.0.0.1/24', '0x7f.0.0.1', '10.0.0.1\n', ''])(
    'rejects the ip %p',
    (value) => {
      expect(isIpValue(value)).toBe(false);
    }
  );

  it.each(['10.0.0.0/24', '10.0.0.7/32', '2001:db8::/32', '10.0.0.1'])(
    'accepts the ip or the CIDR block %s',
    (value) => {
      expect(isIpOrCidrValue(value)).toBe(true);
    }
  );

  it.each([
    '10.0.0.0/33',
    '10.0.0.0/',
    '10.0.0.0/24/1',
    'bogus/24',
    '::ffff:10.0.0.0/120',
    'fe80::1%eth0/64',
    '/24',
  ])('rejects the CIDR block %p', (value) => {
    expect(isIpOrCidrValue(value)).toBe(false);
  });

  it.each(['1', '1.2', '1.2.3', '1.2.3-rc1', '1.2.3+build.5', '999999999.1.1'])(
    'accepts the version %s',
    (value) => {
      expect(isVersionValue(value)).toBe(true);
    }
  );

  it.each(['', 'v1', '1.2.3.4', '1.2.3"', '1.2.3\n', '1234567890.1.1', '1..2'])(
    'rejects the version %p',
    (value) => {
      expect(isVersionValue(value)).toBe(false);
    }
  );
});

describe('parseDateValue', () => {
  it('reads a day as the 24 hours of that day in UTC', () => {
    expect(parseDateValue('2026-10-01', 'date')).toEqual({
      fraction: undefined,
      hasOffset: false,
      lowerMs: Date.UTC(2026, 9, 1),
      unitMs: 24 * 60 * 60 * 1000,
    });
  });

  it('reads the unit that the value writes', () => {
    expect(parseDateValue('2026-10-01T10', 'date')?.unitMs).toBe(60 * 60 * 1000);
    expect(parseDateValue('2026-10-01T10:30', 'date')?.unitMs).toBe(60 * 1000);
    expect(parseDateValue('2026-10-01T10:30:15', 'date')?.unitMs).toBe(1000);
    expect(parseDateValue('2026-10-01T10:30:15Z', 'date_nanos')?.unitMs).toBe(1000);
  });

  it('reads the offset of the value into UTC', () => {
    expect(parseDateValue('2026-10-01T10:00:00+02:00', 'date')).toEqual({
      fraction: undefined,
      hasOffset: true,
      lowerMs: Date.UTC(2026, 9, 1, 8),
      unitMs: 1000,
    });
  });

  it('keeps the fraction and limits its digits to the precision of the type', () => {
    expect(parseDateValue('2026-10-01T10:00:00.123Z', 'date')?.fraction).toBe('123');
    expect(parseDateValue('2026-10-01T10:00:00.1234Z', 'date')).toBeUndefined();
    expect(parseDateValue('2026-10-01T10:00:00.123456789Z', 'date_nanos')?.fraction).toBe(
      '123456789'
    );
    expect(parseDateValue('2026-10-01T10:00:00.1234567891Z', 'date_nanos')).toBeUndefined();
  });

  it.each([
    'bogus',
    '2026-13-01',
    '2026-02-30',
    '2026-10-01T24:00:00Z',
    '2026-10-01Z',
    '2026-10-01T10:00:00+19:00',
    '2026-10-01T10:00:00+02:60',
    '0999-01-01',
    '',
  ])('rejects the date %p', (value) => {
    expect(parseDateValue(value, 'date')).toBeUndefined();
  });

  it('rejects an hour or a minute with no seconds on a date_nanos column, where the DSL fails', () => {
    expect(parseDateValue('2026-10-01T10:30', 'date')).toBeDefined();
    expect(parseDateValue('2026-10-01T10:30', 'date_nanos')).toBeUndefined();
    expect(parseDateValue('2026-10-01T10', 'date_nanos')).toBeUndefined();
  });

  describe('the range that ES|QL reads', () => {
    it('rejects a date after the year 9999 once its offset is applied', () => {
      expect(parseDateValue('9999-12-31T23:59:59.5Z', 'date')).toBeDefined();
      expect(parseDateValue('9999-12-31T23:59:59.5-01:00', 'date')).toBeUndefined();
      expect(parseDateValue('9999-12-31T23:59:59Z', 'date')).toBeDefined();
      expect(parseDateValue('9999-12-31', 'date')).toBeDefined();
      expect(parseDateValue('9999-12-31T23:00:00-01:00', 'date')).toBeUndefined();
    });

    it('rejects a date_nanos before 1970 or after the last nanosecond that fits in 64 bits', () => {
      expect(parseDateValue('1969-12-31T23:59:59Z', 'date_nanos')).toBeUndefined();
      expect(parseDateValue('1969-12-31T23:59:59.5Z', 'date_nanos')).toBeUndefined();
      expect(parseDateValue('1970-01-01T00:00:00Z', 'date_nanos')).toBeDefined();
      expect(parseDateValue('2262-04-11T23:47:16.854775807Z', 'date_nanos')).toBeDefined();
      expect(parseDateValue('2262-04-11T23:47:16.854775808Z', 'date_nanos')).toBeUndefined();
      expect(parseDateValue('2262-04-12T00:00:00Z', 'date_nanos')).toBeUndefined();
      expect(parseDateValue('2262-04-11T23:47:16Z', 'date_nanos')).toBeUndefined();
    });

    it('accepts a date before 1970', () => {
      expect(parseDateValue('1969-12-31T23:59:59.5Z', 'date')).toBeDefined();
      expect(parseDateValue('1969-12-31T23:59:59.500Z', 'date')?.fraction).toBe('500');
      expect(parseDateValue('1500-01-01', 'date')).toBeDefined();
    });
  });
});

describe('toLikePattern', () => {
  it.each([
    ['good*', 'good*'],
    ['a?b', 'a?b'],
    ['a\\*b', 'a\\*b'],
    ['a\\?b', 'a\\?b'],
    ['a\\\\b', 'a\\\\b'],
    ['a\\xb', 'axb'],
    ['', ''],
  ])('writes %p as %p', (value, expected) => {
    expect(toLikePattern(value)).toBe(expected);
  });

  it('rejects a value that ends in a lone backslash', () => {
    expect(toLikePattern('abc\\')).toBeUndefined();
  });

  it('accepts a value of the longest length and rejects a longer one', () => {
    expect(toLikePattern('a'.repeat(MAX_WILDCARD_LENGTH))).toBe('a'.repeat(MAX_WILDCARD_LENGTH));
    expect(toLikePattern('a'.repeat(MAX_WILDCARD_LENGTH + 1))).toBeUndefined();
  });
});

describe('getInvalidValueReason', () => {
  it('says that a wildcard value is too long, without repeating the value', () => {
    const reason = getInvalidValueReason({
      columnType: 'keyword',
      entryType: 'wildcard',
      value: 'a'.repeat(MAX_WILDCARD_LENGTH + 1),
    });

    expect(reason).toBe(`a wildcard value cannot be longer than ${MAX_WILDCARD_LENGTH} characters`);
  });

  it('accepts a valid value', () => {
    expect(
      getInvalidValueReason({ columnType: 'ip', entryType: 'match', value: '10.0.0.1' })
    ).toBeUndefined();
    expect(
      getInvalidValueReason({ columnType: 'keyword', entryType: 'wildcard', value: 'a*' })
    ).toBeUndefined();
    expect(
      getInvalidValueReason({ columnType: 'double', entryType: 'exists', value: '' })
    ).toBeUndefined();
  });

  it('names the entry type that the column type does not support', () => {
    expect(getInvalidValueReason({ columnType: 'double', entryType: 'match', value: '1' })).toBe(
      'an entry of type "match" is not supported on a column of type double'
    );
    expect(getInvalidValueReason({ columnType: 'ip', entryType: 'wildcard', value: '10.*' })).toBe(
      'an entry of type "wildcard" is not supported on a column of type ip'
    );
  });

  it('names the value that does not fit the column type', () => {
    expect(getInvalidValueReason({ columnType: 'ip', entryType: 'match', value: 'bogus' })).toBe(
      'value "bogus" is not valid for a column of type ip'
    );
    expect(
      getInvalidValueReason({ columnType: 'long', entryType: 'match_any', value: '1e3' })
    ).toBe('value "1e3" is not valid for a column of type long');
    expect(
      getInvalidValueReason({ columnType: 'boolean', entryType: 'match', value: 'maybe' })
    ).toBe('value "maybe" is not valid for a column of type boolean');
    expect(getInvalidValueReason({ columnType: 'text', entryType: 'wildcard', value: 'a\\' })).toBe(
      'value "a\\" cannot end in a lone backslash'
    );
  });
});
