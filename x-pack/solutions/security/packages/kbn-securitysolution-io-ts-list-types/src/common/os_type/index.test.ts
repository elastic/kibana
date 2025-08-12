/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { osType, osTypeArrayOrUndefined } from '.';

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';

describe('osType', () => {
  test('it will validate a correct osType', () => {
    const payload = 'windows';
    const decoded = osType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate an incorrect osType', () => {
    const payload = 'foo';
    const decoded = osType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "foo" supplied to ""linux" | "macos" | "windows""',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it will default to an empty array when osTypeArrayOrUndefined is used', () => {
    const payload = undefined;
    const decoded = osTypeArrayOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
