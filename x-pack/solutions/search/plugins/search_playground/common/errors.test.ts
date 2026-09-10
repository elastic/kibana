/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
  it('should return the message if the input is an Error instance', () => {
    const error = new Error('Test error message');
    expect(getErrorMessage(error)).toBe('Test error message');
  });

  it('should return the message and cause message if the input is an Error instance with a cause', () => {
    const error = new Error('Test error message');
    error.cause = new Error('Test cause message');
    expect(getErrorMessage(error)).toBe('Test error message. Caused by: Test cause message');
  });

  it('should return the HTTP error body message for HTTP errors with body message', () => {
    const httpError = new Error('HTTP Error') as Error & {
      body?: Record<string, unknown>;
      request?: any;
      name: string;
    };
    httpError.request = {};
    httpError.name = 'HttpError';
    httpError.body = { message: 'HTTP body error message' };

    expect(getErrorMessage(httpError)).toBe('HTTP body error message');
  });

  it('should return the error message for HTTP errors without body message', () => {
    const httpError = new Error('HTTP Error') as Error & {
      body?: Record<string, unknown>;
      request?: any;
      name: string;
    };
    httpError.request = {};
    httpError.name = 'HttpError';
    httpError.body = { status: 404 };

    expect(getErrorMessage(httpError)).toBe('HTTP Error');
  });

  it('should return the error message for HTTP errors with invalid body', () => {
    const httpError = new Error('HTTP Error') as Error & {
      body?: Record<string, unknown>;
      request?: any;
      name: string;
    };
    httpError.request = {};
    httpError.name = 'HttpError';
    httpError.body = 'invalid body' as any;

    expect(getErrorMessage(httpError)).toBe('HTTP Error');
  });

  it('should prioritize HTTP body message over cause for HTTP errors', () => {
    const httpError = new Error('HTTP Error') as Error & {
      body?: Record<string, unknown>;
      request?: any;
      name: string;
    };
    httpError.request = {};
    httpError.name = 'HttpError';
    httpError.body = { message: 'HTTP body error message' };
    httpError.cause = new Error('Cause message');

    expect(getErrorMessage(httpError)).toBe('HTTP body error message');
  });

  it('should return the input if it is a string', () => {
    const errorMessage = 'Test error message';
    expect(getErrorMessage(errorMessage)).toBe(errorMessage);
  });

  it('should return the message property if the input is an object with a message property', () => {
    const errorObject = { message: 'Test error message' };
    expect(getErrorMessage(errorObject)).toBe('Test error message');
  });

  it('should return the result of toString if the input is an object with a toString method', () => {
    const errorObject = {
      toString: () => 'Test error message',
    };
    expect(getErrorMessage(errorObject)).toBe('Test error message');
  });

  it('should return the string representation of the input if it is not an Error, string, or object with message/toString', () => {
    const errorNumber = 12345;
    expect(getErrorMessage(errorNumber)).toBe('12345');
  });

  it('should return "undefined" if the input is undefined', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('should return "null" if the input is null', () => {
    expect(getErrorMessage(null)).toBe('null');
  });
});
