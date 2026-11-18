/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import {
  EXCEPTION_APPLIES_TO_VALUES,
  ESQL_OUTPUT_COLUMN_TYPES,
} from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';

import { appliesTo, appliesToOrUndefined } from '.';
import { columnType, columnTypeOrUndefined } from '../column_type';

const check = (codec: typeof appliesTo | typeof columnType, payload: unknown) => {
  const decoded = codec.decode(payload);
  const checked = exactCheck(payload, decoded);
  return pipe(checked, foldLeftRight);
};

describe('appliesTo', () => {
  test.each(EXCEPTION_APPLIES_TO_VALUES)('it validates %s', (payload) => {
    const message = check(appliesTo, payload);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it has the values of the shared constants', () => {
    expect(Object.keys(appliesTo.keys).sort()).toEqual([...EXCEPTION_APPLIES_TO_VALUES].sort());
  });

  test.each(['foo', 'esql_output_column', 'document_level_filter', '', 1, null])(
    'it fails to validate %p',
    (payload) => {
      expect(check(appliesTo, payload).errors).not.toEqual([]);
    }
  );

  test('it allows the absence of the value when appliesToOrUndefined is used', () => {
    expect(appliesToOrUndefined.decode(undefined)._tag).toBe('Right');
    expect(appliesToOrUndefined.decode('esql_output_columns')._tag).toBe('Right');
    expect(appliesToOrUndefined.decode('foo')._tag).toBe('Left');
  });
});

describe('columnType', () => {
  test.each([...ESQL_OUTPUT_COLUMN_TYPES])('it validates %s', (payload) => {
    const message = check(columnType, payload);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it has the types of the shared constants', () => {
    expect(Object.keys(columnType.keys).sort()).toEqual([...ESQL_OUTPUT_COLUMN_TYPES].sort());
  });

  test.each(['geo_point', 'unsupported', 'Keyword', '', 1, null])(
    'it fails to validate %p',
    (payload) => {
      expect(check(columnType, payload).errors).not.toEqual([]);
    }
  );

  test('it allows the absence of the type when columnTypeOrUndefined is used', () => {
    expect(columnTypeOrUndefined.decode(undefined)._tag).toBe('Right');
    expect(columnTypeOrUndefined.decode('ip')._tag).toBe('Right');
    expect(columnTypeOrUndefined.decode('foo')._tag).toBe('Left');
  });
});
