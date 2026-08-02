/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHttpFetchError } from '../../../test_helpers/create_http_fetch_error';
import { classifyQueryError, getHttpStatus } from '.';

describe('getHttpStatus', () => {
  it('reads the status off an http fetch error', () => {
    expect(getHttpStatus(createHttpFetchError({ status: 503 }))).toBe(503);
  });

  it('returns undefined for a transport failure, which has no response', () => {
    expect(getHttpStatus(createHttpFetchError())).toBeUndefined();
  });

  it('returns undefined for a plain error', () => {
    expect(getHttpStatus(new Error('boom'))).toBeUndefined();
  });

  it('returns undefined for a non-error value', () => {
    expect(getHttpStatus('boom')).toBeUndefined();
  });
});

describe('classifyQueryError', () => {
  it('classifies a 503 as workflowsUnavailable, the expected status on a stack without workflows management', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 503 }))).toBe('workflowsUnavailable');
  });

  it('classifies a 500 as a server error, which must never render as an empty state', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 500 }))).toBe('serverError');
  });

  it('classifies a 502 as a server error', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 502 }))).toBe('serverError');
  });

  it('classifies a 400 as a bad request', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 400 }))).toBe('badRequest');
  });

  it('classifies a 403 as forbidden, so a rules-write denial fails visibly', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 403 }))).toBe('forbidden');
  });

  it('classifies a 404 as not found', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 404 }))).toBe('notFound');
  });

  it('classifies a 409 as a conflict, which means the gate was already answered', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 409 }))).toBe('conflict');
  });

  it('classifies an unmapped 4xx as unknown', () => {
    expect(classifyQueryError(createHttpFetchError({ status: 418 }))).toBe('unknown');
  });

  it('classifies a transport failure as unknown', () => {
    expect(classifyQueryError(createHttpFetchError())).toBe('unknown');
  });

  it('classifies a plain error as unknown', () => {
    expect(classifyQueryError(new Error('boom'))).toBe('unknown');
  });

  it('classifies null as unknown', () => {
    expect(classifyQueryError(null)).toBe('unknown');
  });
});
