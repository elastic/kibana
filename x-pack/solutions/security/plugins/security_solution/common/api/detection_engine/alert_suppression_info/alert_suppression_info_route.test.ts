/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/Either';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { AlertSuppressionInfoRequestBody } from './alert_suppression_info_route';

describe('Alert suppression info request schema', () => {
  test('validates with alert_ids array', () => {
    const payload = {
      alert_ids: ['alert-1', 'alert-2'],
    };

    const decoded = AlertSuppressionInfoRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('validates with query string', () => {
    const payload = {
      query: `
        {"bool":{"filter":{"terms":{"_id":["123"]}}}}
      `,
    };

    const decoded = AlertSuppressionInfoRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('does NOT validate with empty object', () => {
    const payload = {};

    const decoded = AlertSuppressionInfoRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "{}" supplied to : AlertSuppressionInfoRequestBody',
    ]);
    expect(message.schema).toEqual({});
  });

  test('does NOT validate with invalid alert_ids (not an array)', () => {
    const payload = {
      alert_ids: 'not-an-array',
    };

    const decoded = AlertSuppressionInfoRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "not-an-array" supplied to "alert_ids"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('does NOT validate with invalid query (not a string)', () => {
    const payload = {
      query: 123,
    };

    const decoded = AlertSuppressionInfoRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);

    expect(getPaths(left(message.errors))).toEqual(['Invalid value 123 supplied to "query"']);
    expect(message.schema).toEqual({});
  });
});
