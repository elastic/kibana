/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSanitizedError } from './sanitize_error';

describe('getSanitizedError', () => {
  it('should return an object with only safe properties when given a standard Error object', () => {
    const originalError = new Error('Original error message');
    originalError.name = 'OriginalError';
    (originalError as any).someConfig = 'This should not be included';

    const sanitizedError = getSanitizedError(originalError);

    expect(sanitizedError.message).toBe(originalError.message);
    expect(sanitizedError.name).toBe(originalError.name);
    expect(sanitizedError.stack).toBe(originalError.stack);
    expect((sanitizedError as any).someConfig).toBeUndefined();
  });

  it('should return an object with only safe properties when given a fetch-like error with response', () => {
    const originalError = Object.assign(new Error('Original error message'), {
      code: '500',
      response: { status: 500 },
    });
    originalError.name = 'OriginalError';
    (originalError as any).someConfig = 'This should not be included';

    const sanitizedError = getSanitizedError(originalError);

    expect(sanitizedError.message).toBe(originalError.message);
    expect(sanitizedError.code).toBe(originalError.code);
    expect(sanitizedError.status).toBe(originalError.response?.status);
    expect((sanitizedError as any).someConfig).toBeUndefined();
  });
});
