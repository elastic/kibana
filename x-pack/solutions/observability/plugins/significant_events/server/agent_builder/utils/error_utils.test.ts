/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SignificantEventsPausedError } from '../../lib/errors/significant_events_paused_error';
import { classifyError } from './error_utils';
import { SourceDisabledError, UnknownSourceSlugError } from './resolve_source_slugs';

describe('classifyError', () => {
  it('returns the unknown-slug message without matching other not-found errors', () => {
    expect(classifyError(new UnknownSourceSlugError(['checkout']))).toBe(
      'Source not found in this space: checkout'
    );
    expect(classifyError(new Error('index not found in cluster'))).toBe(
      'Unexpected error: index not found in cluster'
    );
  });

  it('returns the disabled-source message', () => {
    expect(classifyError(new SourceDisabledError('payments'))).toBe('Source "payments" is disabled.');
  });

  it('leaves a generic 404 as an unexpected error', () => {
    const err = Object.assign(new Error('resource unavailable'), { statusCode: 404 });
    expect(classifyError(err)).toBe('Unexpected error: resource unavailable');
  });

  it('returns permissions message for security_exception', () => {
    const result = classifyError(new Error('security_exception: unauthorized'));
    expect(result).toContain('Insufficient index privileges');
  });

  it('returns verification message for verification_exception', () => {
    const result = classifyError(new Error('verification_exception: Unknown column'));
    expect(result).toContain('verification failed');
  });

  it('returns connector message for "No connector available"', () => {
    const result = classifyError(new Error('No connector available'));
    expect(result).toContain('inference connector');
  });

  it('returns pause remediation for SignificantEventsPausedError before generic 409', () => {
    expect(classifyError(new SignificantEventsPausedError())).toContain(
      'Significant Events activity is paused'
    );
  });

  it('returns lock contention message for 409 statusCode', () => {
    const err = Object.assign(new Error('conflict'), { statusCode: 409 });
    expect(classifyError(err)).toBe('Another operation is in progress. Try again in a moment.');
  });

  it('returns lock contention message for "Could not acquire lock" in message', () => {
    expect(classifyError(new Error('Could not acquire lock on streams/apply_changes'))).toBe(
      'Another operation is in progress. Try again in a moment.'
    );
  });

  it('returns message with truncated details for unknown errors', () => {
    expect(classifyError(new Error('something random'))).toBe('Unexpected error: something random');
  });

  it('handles non-Error values (string)', () => {
    expect(classifyError('security_exception: unauthorized')).toContain(
      'Insufficient index privileges'
    );
  });

  it('handles non-Error values (plain object) via String coercion', () => {
    expect(classifyError({ message: 'Cannot find stream' })).toContain('Unexpected error:');
  });

  it('handles non-Error with toString containing keywords', () => {
    const obj = { toString: () => 'security_exception: forbidden' };
    expect(classifyError(obj)).toContain('Insufficient index privileges');
  });

  it('returns permissions message for 403 statusCode', () => {
    const err = Object.assign(new Error('forbidden'), { statusCode: 403 });
    expect(classifyError(err)).toContain('Insufficient index privileges');
  });

  it('returns permissions message for security_exception error type in body', () => {
    const err = { message: 'auth error', body: { error: { type: 'security_exception' } } };
    expect(classifyError(err)).toContain('Insufficient index privileges');
  });

  it('reads statusCode from meta.statusCode', () => {
    const err = Object.assign(new Error('not found'), { meta: { statusCode: 404 } });
    expect(classifyError(err)).toBe('Unexpected error: not found');
  });
});
