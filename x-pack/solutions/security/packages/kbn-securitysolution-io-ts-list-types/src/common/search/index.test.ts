/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { searchOrUndefined } from '.';

import * as t from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';

describe('search', () => {
  test('it will validate a correct search', () => {
    const payload = 'name:foo';
    const decoded = searchOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will validate with the value of "undefined"', () => {
    const obj = t.exact(
      t.type({
        search: searchOrUndefined,
      })
    );
    const payload: t.TypeOf<typeof obj> = {
      search: undefined,
    };
    const decoded = obj.decode({
      pit_id: undefined,
    });
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will fail to validate an incorrect search', () => {
    const payload = ['foo'];
    const decoded = searchOrUndefined.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "["foo"]" supplied to "(string | undefined)"',
    ]);
    expect(message.schema).toEqual({});
  });
});
