/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSanitizedError } from './sanitize_error';

describe('getSanitizedError', () => {
  it('returns an error with only safe properties', () => {
    const originalError = new Error('Original error message');
    originalError.name = 'OriginalError';
    (originalError as any).sensitiveInfo = 'This should not be included';

    const sanitizedError = getSanitizedError(originalError);

    expect(sanitizedError.message).toBe(originalError.message);
    expect(sanitizedError.name).toBe(originalError.name);
    expect((sanitizedError as any).sensitiveInfo).toBeUndefined();
  });
});
