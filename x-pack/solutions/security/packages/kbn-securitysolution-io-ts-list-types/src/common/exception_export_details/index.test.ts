/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/pipeable';
import { left } from 'fp-ts/Either';
import { getExceptionExportDetailsMock } from './index.mock';
import { exportExceptionDetailsSchema, ExportExceptionDetails } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('exportExceptionDetails', () => {
  test('it should validate export meta', () => {
    const payload = getExceptionExportDetailsMock();
    const decoded = exportExceptionDetailsSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should strip out extra keys', () => {
    const payload: ExportExceptionDetails & {
      extraKey?: string;
    } = getExceptionExportDetailsMock();
    payload.extraKey = 'some extra key';
    const decoded = exportExceptionDetailsSchema.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getExceptionExportDetailsMock());
  });
});
