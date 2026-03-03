/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { RiskScore } from '.';

describe('risk_score', () => {
  test('it should validate a positive number', () => {
    const payload = 1;
    const decoded = RiskScore.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate a zero', () => {
    const payload = 0;
    const decoded = RiskScore.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate a negative number', () => {
    const payload = -1;
    const decoded = RiskScore.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "-1" supplied to "RiskScore"']);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a string', () => {
    const payload = 'some string';
    const decoded = RiskScore.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "RiskScore"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate a risk score greater than 100', () => {
    const payload = 101;
    const decoded = RiskScore.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "101" supplied to "RiskScore"']);
    expect(message.schema).toEqual({});
  });
});
