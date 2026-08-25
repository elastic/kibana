/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { ListOperatorEnum as OperatorEnum, listOperator as operator } from '.';

describe('operator', () => {
  test('it should validate for "included"', () => {
    const payload = 'included';
    const decoded = operator.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate for "excluded"', () => {
    const payload = 'excluded';
    const decoded = operator.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should contain same amount of keys as enum', () => {
    // Might seem like a weird test, but its meant to
    // ensure that if operator is updated, you
    // also update the operatorEnum, a workaround
    // for io-ts not yet supporting enums
    // https://github.com/gcanti/io-ts/issues/67
    const keys = Object.keys(operator.keys).sort().join(',').toLowerCase();
    const enumKeys = Object.keys(OperatorEnum).sort().join(',').toLowerCase();

    expect(keys).toEqual(enumKeys);
  });
});
