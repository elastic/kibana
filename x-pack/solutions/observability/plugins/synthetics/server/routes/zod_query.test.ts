/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidationError } from '@kbn/config-schema';
import { RouteValidationError } from '@kbn/core-http-server';
import { z } from '@kbn/zod';
import {
  asRouteSchema,
  jsonArrayFromString,
  maxArraySizeMessage,
  minLengthMessage,
  routeId,
} from './zod_query';

const factory = {
  ok: <T>(value: T) => ({ value }),
  badRequest: (error: unknown, path?: string[]) => ({
    error: new RouteValidationError(error, path),
  }),
};

describe('jsonArrayFromString', () => {
  const schema = jsonArrayFromString(routeId, 100).optional();

  it('parses a JSON-encoded query array the way config-schema arrayOf did', () => {
    expect(schema.parse('["*"]')).toEqual(['*']);
    expect(schema.parse('["default","other"]')).toEqual(['default', 'other']);
  });

  it('accepts a real array', () => {
    expect(schema.parse(['default'])).toEqual(['default']);
  });

  it('leaves missing values optional', () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });

  it('rejects a non-JSON string', () => {
    expect(schema.safeParse('default').success).toBe(false);
  });
});

describe('asRouteSchema', () => {
  it('400s empty labels with the former config-schema message', () => {
    const schema = asRouteSchema(
      z.object({
        label: z
          .string()
          .min(1, { error: minLengthMessage(1) })
          .max(1024)
          .optional(),
      })
    );
    const result = schema({ label: '' }, factory);
    expect('error' in result && result.error).toBeInstanceOf(RouteValidationError);
    if (!('error' in result) || !result.error) {
      throw new Error('expected validation error');
    }
    expect(new ValidationError(result.error, 'request body').message).toBe(
      '[request body.label]: value has length [0] but it must have a minimum length of [1].'
    );
  });

  it('400s oversized arrays with the former config-schema message', () => {
    const schema = asRouteSchema(
      z.object({
        monitors: z.array(routeId).max(500, { error: maxArraySizeMessage(500) }),
      })
    );
    const result = schema({ monitors: Array.from({ length: 501 }, (_, i) => `id-${i}`) }, factory);
    if (!('error' in result) || !result.error) {
      throw new Error('expected validation error');
    }
    expect(new ValidationError(result.error, 'request body').message).toBe(
      '[request body.monitors]: array size is [501], but cannot be greater than [500]'
    );
  });
});
