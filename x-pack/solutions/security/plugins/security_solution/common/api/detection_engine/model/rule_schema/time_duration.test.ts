/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import { TimeDuration } from './time_duration'; // Update with the actual path to your TimeDuration file

describe('TimeDuration schema', () => {
  test('it should validate a correctly formed TimeDuration with time unit of seconds', () => {
    const payload = '1s';
    const schema = TimeDuration({ allowedUnits: ['s'] });

    const result = schema.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a correctly formed TimeDuration with time unit of minutes', () => {
    const payload = '100m';
    const schema = TimeDuration({ allowedUnits: ['s', 'm'] });

    const result = schema.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a correctly formed TimeDuration with time unit of hours', () => {
    const payload = '10000000h';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h'] });

    const result = schema.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should validate a correctly formed TimeDuration with time unit of days', () => {
    const payload = '7d';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] });

    const result = schema.safeParse(payload);
    expectParseSuccess(result);
    expect(result.data).toEqual(payload);
  });

  test('it should NOT validate a correctly formed TimeDuration with time unit of seconds if it is not an allowed unit', () => {
    const payload = '30s';
    const schema = TimeDuration({ allowedUnits: ['m', 'h', 'd'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });

  test('it should NOT validate a negative TimeDuration', () => {
    const payload = '-10s';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });

  test('it should NOT validate a fractional number', () => {
    const payload = '1.5s';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });

  test('it should NOT validate a TimeDuration with an invalid time unit', () => {
    const payload = '10000000days';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h', 'd'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });

  test('it should NOT validate a TimeDuration with a time interval with incorrect format', () => {
    const payload = '100ff0000w';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });

  test('it should NOT validate an empty string', () => {
    const payload = '';
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });

  test('it should NOT validate a number', () => {
    const payload = 100;
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Expected string, received number"`
    );
  });

  test('it should NOT validate a TimeDuration with a valid time unit but unsafe integer', () => {
    const payload = `${Math.pow(2, 53)}h`;
    const schema = TimeDuration({ allowedUnits: ['s', 'm', 'h'] });

    const result = schema.safeParse(payload);
    expectParseError(result);
    expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
      `"Invalid time duration format. Must be a string that is not empty, and composed of a positive integer greater than 0 followed by a unit of time in the format {safe_integer}{timeUnit}, e.g. \\"30s\\", \\"1m\\", \\"2h\\", \\"7d\\""`
    );
  });
});
