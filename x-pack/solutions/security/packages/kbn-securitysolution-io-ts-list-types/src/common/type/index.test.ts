/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import type { Type } from '.';
import { type } from '.';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('type', () => {
  test('it will work with a given expected type', () => {
    const payload: Type = 'keyword';
    const decoded = type.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will give an error if given a type that does not exist', () => {
    const payload: Type | 'madeup' = 'madeup';
    const decoded = type.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const [errorPath] = getPaths(left(message.errors));
    expect(errorPath).toMatch(/^Invalid value "madeup" supplied to "/);
    expect(errorPath).toContain('"binary"');
    expect(errorPath).toContain('"text"');
    expect(message.schema).toEqual({});
  });
});
