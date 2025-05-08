/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { getAcknowledgeSchemaResponseMock } from './index.mock';
import { AcknowledgeSchema, acknowledgeSchema } from '.';

describe('acknowledge_schema', () => {
  test('it should validate a typical response', () => {
    const payload = getAcknowledgeSchemaResponseMock();
    const decoded = acknowledgeSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
  test('it should NOT accept an undefined for "ok"', () => {
    const payload = getAcknowledgeSchemaResponseMock();
    // @ts-expect-error
    delete payload.acknowledged;
    const decoded = acknowledgeSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "acknowledged"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: AcknowledgeSchema & { extraKey?: string } = getAcknowledgeSchemaResponseMock();
    payload.extraKey = 'some new value';
    const decoded = acknowledgeSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
