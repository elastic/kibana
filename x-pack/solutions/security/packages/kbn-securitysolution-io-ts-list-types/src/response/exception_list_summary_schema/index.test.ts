/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { getListSummaryResponseMock } from './index.mock';
import { ExceptionListSummarySchema, exceptionListSummarySchema } from '.';

describe('list_summary_schema', () => {
  test('it should validate a typical list summary response', () => {
    const payload = getListSummaryResponseMock();
    const decoded = exceptionListSummarySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "windows"', () => {
    const payload = getListSummaryResponseMock();
    // @ts-expect-error
    delete payload.windows;
    const decoded = exceptionListSummarySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "windows"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "linux"', () => {
    const payload = getListSummaryResponseMock();
    // @ts-expect-error
    delete payload.linux;
    const decoded = exceptionListSummarySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "linux"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "macos"', () => {
    const payload = getListSummaryResponseMock();
    // @ts-expect-error
    delete payload.macos;
    const decoded = exceptionListSummarySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "macos"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT accept an undefined for "total"', () => {
    const payload = getListSummaryResponseMock();
    // @ts-expect-error
    delete payload.total;
    const decoded = exceptionListSummarySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "total"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ExceptionListSummarySchema & {
      extraKey?: string;
    } = getListSummaryResponseMock();
    payload.extraKey = 'some new value';
    const decoded = exceptionListSummarySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
