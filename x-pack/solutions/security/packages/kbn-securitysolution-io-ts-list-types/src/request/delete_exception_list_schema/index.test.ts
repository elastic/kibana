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

import { DeleteExceptionListSchema, deleteExceptionListSchema } from '.';
import { getDeleteExceptionListSchemaMock } from './index.mock';

describe('delete_exception_list_schema', () => {
  test('it should validate a typical exception list request', () => {
    const payload = getDeleteExceptionListSchemaMock();
    const decoded = deleteExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an undefined for "namespace_type" but default to "single"', () => {
    const payload = getDeleteExceptionListSchemaMock();
    delete payload.namespace_type;
    const decoded = deleteExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getDeleteExceptionListSchemaMock());
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: DeleteExceptionListSchema & {
      extraKey?: string;
    } = getDeleteExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = deleteExceptionListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
