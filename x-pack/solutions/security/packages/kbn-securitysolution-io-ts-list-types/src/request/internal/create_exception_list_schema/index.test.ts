/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';

import { ExceptionListTypeEnum } from '../../../common/exception_list';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { internalCreateExceptionListSchema } from '.';
import { getCreateExceptionListSchemaMock } from '../../create_exception_list_schema/index.mock';

describe('create_exception_list_schema', () => {
  test('it should accept artifact list_id', () => {
    const payload = {
      ...getCreateExceptionListSchemaMock(),
      list_id: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
    };
    const decoded = internalCreateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should fail when invalid list_id', () => {
    const payload = {
      ...getCreateExceptionListSchemaMock(),
      list_id: ExceptionListTypeEnum.DETECTION,
    };
    const decoded = internalCreateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "detection" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });
  test('it should accept artifact type', () => {
    const payload = {
      ...getCreateExceptionListSchemaMock(),
      list_id: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
      type: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
    };
    const decoded = internalCreateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should fail when invalid type', () => {
    const payload = {
      ...getCreateExceptionListSchemaMock(),
      list_id: ExceptionListTypeEnum.ENDPOINT_BLOCKLISTS,
      type: ExceptionListTypeEnum.DETECTION,
    };
    const decoded = internalCreateExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "detection" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });
});
