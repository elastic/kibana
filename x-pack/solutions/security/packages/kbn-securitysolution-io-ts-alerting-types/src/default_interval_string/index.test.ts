/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import { DefaultIntervalString } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('default_interval_string', () => {
  test('it should validate a interval string', () => {
    const payload = '20m';
    const decoded = DefaultIntervalString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate a number', () => {
    const payload = 5;
    const decoded = DefaultIntervalString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultIntervalString"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default of "5m"', () => {
    const payload = null;
    const decoded = DefaultIntervalString.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual('5m');
  });
});
