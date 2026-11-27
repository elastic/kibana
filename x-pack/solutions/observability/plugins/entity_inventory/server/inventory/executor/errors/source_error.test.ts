/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { toErrorDetail } from './source_error';

const responseError = (statusCode: number, body: Record<string, unknown>) =>
  new errors.ResponseError({
    statusCode,
    body,
    headers: {},
    warnings: [],
    meta: {} as never,
  });

describe('toErrorDetail', () => {
  it('reads the status and the type and reason of an Elasticsearch body', () => {
    const error = responseError(400, {
      error: {
        type: 'verification_exception',
        reason: 'Found 1 problem\nline 1:1: Unknown column [cpu]',
      },
      status: 400,
    });

    expect(toErrorDetail(error)).toEqual({
      status: 400,
      reason: 'verification_exception: Found 1 problem\nline 1:1: Unknown column [cpu]',
    });
  });

  it('uses the reason alone when the body has no type', () => {
    const error = { meta: { statusCode: 500, body: { error: { reason: 'shard failure' } } } };

    expect(toErrorDetail(error)).toEqual({
      status: 500,
      reason: 'shard failure',
    });
  });

  it('falls back to the message and a top-level status code', () => {
    const error = Object.assign(new Error('connection refused'), { statusCode: 503 });

    expect(toErrorDetail(error)).toEqual({
      status: 503,
      reason: 'connection refused',
    });
  });

  it('has a null status when there is none', () => {
    expect(toErrorDetail(new Error('aborted'))).toEqual({
      status: null,
      reason: 'aborted',
    });
  });

  it('handles a non-Error throwable', () => {
    expect(toErrorDetail('socket hang up')).toEqual({
      status: null,
      reason: 'socket hang up',
    });
    expect(toErrorDetail(undefined)).toEqual({
      status: null,
      reason: 'unknown error',
    });
    expect(toErrorDetail(42)).toEqual({
      status: null,
      reason: 'unknown error',
    });
  });

  it('returns a plain object without a stack or the raw body', () => {
    const error = responseError(400, {
      error: { type: 'parsing_exception', reason: 'bad query', stack_trace: 'at Foo.bar' },
    });

    const result = toErrorDetail(error);

    expect(Object.keys(result).sort()).toEqual(['reason', 'status']);
    expect(result).not.toHaveProperty('stack');
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
