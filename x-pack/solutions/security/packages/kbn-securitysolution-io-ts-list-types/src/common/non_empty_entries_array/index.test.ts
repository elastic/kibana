/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { EntriesArray } from '../entries';
import { nonEmptyEntriesArray } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEntryMatchMock } from '../entry_match/index.mock';
import { getEntryMatchAnyMock } from '../entry_match_any/index.mock';
import { getEntryExistsMock } from '../entries_exist/index.mock';
import {
  getEntriesArrayMock,
  getListAndNonListEntriesArrayMock,
  getListEntriesArrayMock,
} from '../entries/index.mock';
import { getEntryNestedMock } from '../entry_nested/index.mock';

describe('non_empty_entries_array', () => {
  test('it should FAIL validation when given an empty array', () => {
    const payload: EntriesArray = [];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "[]" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when given "undefined"', () => {
    const payload = undefined;
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when given "null"', () => {
    const payload = null;
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "null" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should validate an array of "match" entries', () => {
    const payload: EntriesArray = [getEntryMatchMock(), getEntryMatchMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "match_any" entries', () => {
    const payload: EntriesArray = [getEntryMatchAnyMock(), getEntryMatchAnyMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "exists" entries', () => {
    const payload: EntriesArray = [getEntryExistsMock(), getEntryExistsMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "list" entries', () => {
    const payload: EntriesArray = [...getListEntriesArrayMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of "nested" entries', () => {
    const payload: EntriesArray = [getEntryNestedMock(), getEntryNestedMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of entries', () => {
    const payload: EntriesArray = [...getEntriesArrayMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should FAIL validation when given an array of entries of value list and non-value list entries', () => {
    const payload: EntriesArray = [...getListAndNonListEntriesArrayMock()];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Cannot have entry of type list and other']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when given an array of non entries', () => {
    const payload = [1];
    const decoded = nonEmptyEntriesArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "NonEmptyEntriesArray"',
    ]);
    expect(message.schema).toEqual({});
  });
});
