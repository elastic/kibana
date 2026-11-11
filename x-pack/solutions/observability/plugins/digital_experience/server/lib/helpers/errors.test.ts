/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { badRequest, forbidden } from '@hapi/boom';
import { describeError, isAccessDenied, toClientError } from './errors';

const esError = (statusCode: number) =>
  new esErrors.ResponseError({
    statusCode,
    body: { error: { type: 'security_exception', reason: 'unauthorized for user [someone]' } },
    headers: {},
    warnings: null,
    meta: {} as never,
  });

describe('isAccessDenied', () => {
  it('is true for a 403 from Elasticsearch', () => {
    expect(isAccessDenied(esError(403))).toBe(true);
  });

  it('is true for a 403 from Elasticsearch that APMEventClient wrapped', () => {
    const wrapped = Object.assign(new Error('wrapped'), { originalError: esError(403) });
    expect(isAccessDenied(wrapped)).toBe(true);
  });

  it('is true for a 403 from Kibana', () => {
    expect(isAccessDenied(forbidden('no APM access'))).toBe(true);
  });

  it('is false for other status codes', () => {
    expect(isAccessDenied(esError(500))).toBe(false);
    expect(isAccessDenied(badRequest('bad'))).toBe(false);
  });

  it('is false for errors without a status code', () => {
    expect(isAccessDenied(new Error('boom'))).toBe(false);
    expect(isAccessDenied('denied')).toBe(false);
    expect(isAccessDenied(undefined)).toBe(false);
  });
});

describe('describeError', () => {
  it('returns the message of an Error', () => {
    expect(describeError(new Error('index not found'))).toBe('index not found');
  });

  it('stringifies anything else', () => {
    expect(describeError('timeout')).toBe('timeout');
    expect(describeError(42)).toBe('42');
    expect(describeError(undefined)).toBe('undefined');
  });
});

describe('toClientError', () => {
  it('answers 403 without the user or roles when access is denied', () => {
    const error = toClientError(esError(403));

    expect(error).toMatchObject({
      isBoom: true,
      output: { statusCode: 403 },
      message: "You don't have read access to the application data.",
    });
    expect(error.message).not.toContain('someone');
  });

  it('answers 500 without the index names when a search fails', () => {
    expect(toClientError(new Error('no such index [logs-generic.otel-default]'))).toMatchObject({
      isBoom: true,
      output: { statusCode: 500 },
      message: 'Could not load the data. Check the Kibana server logs for details.',
    });
  });

  it('keeps the errors a route chose and aborted requests as they are', () => {
    const chosen = badRequest('bad');
    const aborted = new esErrors.RequestAbortedError('aborted');

    expect(toClientError(chosen)).toBe(chosen);
    expect(toClientError(aborted)).toBe(aborted);
  });
});
