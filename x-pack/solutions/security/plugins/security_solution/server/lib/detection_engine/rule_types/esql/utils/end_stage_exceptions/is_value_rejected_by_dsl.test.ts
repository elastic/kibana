/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValueRejectedByDsl } from './is_value_rejected_by_dsl';

// Each row is a `match_phrase` query on a field of the type, sent in the filter of an ES|QL request: the
// first list holds the values that made the request fail, the second the values that got a response.
describe('isValueRejectedByDsl', () => {
  it.each([
    ['ip', 'bogus'],
    ['ip', '10.0.0.256'],
    ['ip', '10.0.0'],
    ['ip', '010.0.0.1'],
    ['ip', ' 1.2.3.4'],
    ['ip', '10.0.0.0/33'],
    ['ip', ''],
    ['integer', '0x10'],
    ['double', '0x10'],
    ['integer', 'many'],
    ['integer', ''],
    ['long', 'many'],
    ['long', ''],
    ['unsigned_long', 'many'],
    ['double', 'many'],
    ['double', ''],
    ['boolean', '1'],
    ['boolean', 'TRUE'],
    ['boolean', 'True'],
    ['boolean', 'yes'],
    ['boolean', ''],
    ['boolean', 'maybe'],
  ])('is true for a value that the DSL fails on: %s %j', (type, value) => {
    expect(isValueRejectedByDsl(value, type)).toBe(true);
  });

  it.each([
    ['ip', '10.0.0.5'],
    ['ip', '::1'],
    ['ip', '::ffff:1.2.3.4'],
    ['ip', '10.0.0.0/24'],
    ['ip', '1.2.3.4/+8'],
    ['ip', 'fe80::1%eth0'],
    ['integer', '42'],
    ['integer', '2147483648'],
    ['integer', '-5'],
    ['integer', '+5'],
    ['integer', '42.0'],
    ['integer', '42.5'],
    ['integer', '1e3'],
    ['integer', ' 5'],
    ['long', '42.0'],
    ['long', '9223372036854775808'],
    ['long', '1e3'],
    ['unsigned_long', '-1'],
    ['unsigned_long', '18446744073709551616'],
    ['unsigned_long', '5.0'],
    ['double', '3.14'],
    ['double', '.5'],
    ['double', 'NaN'],
    ['double', 'Infinity'],
    ['boolean', 'true'],
    ['boolean', 'false'],
  ])('is false for a value that the DSL accepts: %s %j', (type, value) => {
    expect(isValueRejectedByDsl(value, type)).toBe(false);
  });

  it.each(['1.2.3', 'not-a-version', '', 'v1.2.3'])(
    'is false for any value of a version field, which accepts any string: %j',
    (value) => {
      expect(isValueRejectedByDsl(value, 'version')).toBe(false);
    }
  );

  it.each(['date', 'date_nanos'])(
    'is false for any value of a %s field, whose formats depend on the mapping',
    (type) => {
      expect(isValueRejectedByDsl('not-a-date', type)).toBe(false);
    }
  );

  it.each(['keyword', 'text'])('is false for a %s field, which accepts any string', (type) => {
    expect(isValueRejectedByDsl('anything', type)).toBe(false);
  });
});
