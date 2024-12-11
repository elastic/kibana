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

import { LIST_ID } from '../../constants/index.mock';

import { FindListItemSchema, FindListItemSchemaDecoded, findListItemSchema } from '.';
import { getFindListItemSchemaDecodedMock, getFindListItemSchemaMock } from './index.mock';

describe('find_list_item_schema', () => {
  test('it should validate a typical find item request', () => {
    const payload = getFindListItemSchemaMock();
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getFindListItemSchemaDecodedMock());
  });

  test('it should validate just a list_id where it decodes into an array for list_id and adds a namespace_type of "single"', () => {
    const payload: FindListItemSchema = { list_id: LIST_ID };
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: FindListItemSchemaDecoded = {
      cursor: undefined,
      filter: undefined,
      list_id: LIST_ID,
      page: undefined,
      per_page: undefined,
      sort_field: undefined,
      sort_order: undefined,
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with page missing', () => {
    const payload = getFindListItemSchemaMock();
    delete payload.page;
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindListItemSchemaDecodedMock();
    delete expected.page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with pre_page missing', () => {
    const payload = getFindListItemSchemaMock();
    delete payload.per_page;
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindListItemSchemaDecodedMock();
    delete expected.per_page;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_field missing', () => {
    const payload = getFindListItemSchemaMock();
    delete payload.sort_field;
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindListItemSchemaDecodedMock();
    delete expected.sort_field;
    expect(message.schema).toEqual(expected);
  });

  test('it should validate with sort_order missing', () => {
    const payload = getFindListItemSchemaMock();
    delete payload.sort_order;
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    const expected = getFindListItemSchemaDecodedMock();
    delete expected.sort_order;
    expect(message.schema).toEqual(expected);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: FindListItemSchema & {
      extraKey: string;
    } = { ...getFindListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = findListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
