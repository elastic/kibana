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
import { getEndpointEntryMatchAnyMock } from './index.mock';
import { EndpointEntryMatchAny, endpointEntryMatchAny } from '.';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { getEntryMatchAnyMock } from '../../entry_match_any/index.mock';

describe('endpointEntryMatchAny', () => {
  test('it should validate an entry', () => {
    const payload = getEndpointEntryMatchAnyMock();
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate when operator is "excluded"', () => {
    // Use the generic entry mock so we can test operator: excluded
    const payload = getEntryMatchAnyMock();
    payload.operator = 'excluded';
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "excluded" supplied to "operator"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when field is empty string', () => {
    const payload: Omit<EndpointEntryMatchAny, 'field'> & { field: string } = {
      ...getEndpointEntryMatchAnyMock(),
      field: '',
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "" supplied to "field"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when value is empty array', () => {
    const payload: Omit<EndpointEntryMatchAny, 'value'> & { value: string[] } = {
      ...getEndpointEntryMatchAnyMock(),
      value: [],
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "[]" supplied to "value"']);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when value is not string array', () => {
    const payload: Omit<EndpointEntryMatchAny, 'value'> & { value: string } = {
      ...getEndpointEntryMatchAnyMock(),
      value: 'some string',
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "value"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should FAIL validation when "type" is not "match_any"', () => {
    const payload: Omit<EndpointEntryMatchAny, 'type'> & { type: string } = {
      ...getEndpointEntryMatchAnyMock(),
      type: 'match',
    };
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value "match" supplied to "type"']);
    expect(message.schema).toEqual({});
  });

  test('it should strip out extra keys', () => {
    const payload: EndpointEntryMatchAny & {
      extraKey?: string;
    } = getEndpointEntryMatchAnyMock();
    payload.extraKey = 'some extra key';
    const decoded = endpointEntryMatchAny.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(getEntryMatchAnyMock());
  });
});
