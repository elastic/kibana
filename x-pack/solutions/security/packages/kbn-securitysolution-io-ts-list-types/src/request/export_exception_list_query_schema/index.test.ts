/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { ExportExceptionListQuerySchema, exportExceptionListQuerySchema } from '.';
import { getExportExceptionListQuerySchemaMock } from './index.mock';

describe('export_exception_list_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getExportExceptionListQuerySchemaMock();
    const decoded = exportExceptionListQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for an id', () => {
    const payload = getExportExceptionListQuerySchemaMock();
    // @ts-expect-error
    delete payload.id;
    const decoded = exportExceptionListQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('it should default namespace_type to "single" if an undefined given for namespacetype', () => {
    const payload = getExportExceptionListQuerySchemaMock();
    delete payload.namespace_type;
    const decoded = exportExceptionListQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(message.schema).toEqual({
      id: 'uuid_here',
      include_expired_exceptions: 'true',
      list_id: 'some-list-id',
      namespace_type: 'single',
    });
  });

  test('it should NOT accept an undefined for an list_id', () => {
    const payload = getExportExceptionListQuerySchemaMock();
    // @ts-expect-error
    delete payload.list_id;
    const decoded = exportExceptionListQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: ExportExceptionListQuerySchema & {
      extraKey?: string;
    } = getExportExceptionListQuerySchemaMock();
    payload.extraKey = 'some new value';
    const decoded = exportExceptionListQuerySchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
