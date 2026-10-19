/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import {
  SandboxAllowlistDisabledError,
  SandboxAllowlistValidationError,
} from '../sandbox_allowlist';
import { rethrowSandboxAllowlistError } from './sandbox_allowlist';

const statusOf = (error: unknown): number | undefined => {
  try {
    rethrowSandboxAllowlistError(error);
  } catch (thrown) {
    return isBoom(thrown) ? thrown.output.statusCode : undefined;
  }
};

describe('rethrowSandboxAllowlistError', () => {
  it('maps validation errors to 400', () => {
    expect(statusOf(new SandboxAllowlistValidationError('bad host'))).toBe(400);
  });

  it('maps a disabled Nightshift to 404', () => {
    expect(statusOf(new SandboxAllowlistDisabledError())).toBe(404);
  });

  it('rethrows unknown errors unchanged', () => {
    const error = new Error('unexpected');
    expect(() => rethrowSandboxAllowlistError(error)).toThrow(error);
  });
});
