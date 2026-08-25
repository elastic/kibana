/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { maxSizeOrUndefined } from '.';

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';

describe('maxSizeOrUndefined', () => {
  test('it will validate a correct max value', () => {
    const payload = 123;
    const decoded = maxSizeOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate a 0', () => {
    const payload = 0;
    const decoded = maxSizeOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "0" supplied to "(PositiveIntegerGreaterThanZero | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it will fail to validate a -1', () => {
    const payload = -1;
    const decoded = maxSizeOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "-1" supplied to "(PositiveIntegerGreaterThanZero | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it will fail to validate a string', () => {
    const payload = '123';
    const decoded = maxSizeOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "123" supplied to "(PositiveIntegerGreaterThanZero | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });
});
