/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVersionConflict, toFeatureFlagsApiError } from './api_error';

class FakeHttpError extends Error {
  public readonly request = {} as Request;
  public readonly response: Response;
  public readonly body: unknown;

  constructor(status: number, body: unknown) {
    super('Bad Request');
    this.response = { status } as Response;
    this.body = body;
  }
}

describe('feature flags API errors', () => {
  it('reads the message, status and issues', () => {
    const error = toFeatureFlagsApiError(
      new FakeHttpError(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: 'The flag is invalid.\n- variations.0: wrong type',
        attributes: { issues: [{ path: 'variations.0', message: 'wrong type' }] },
      })
    );

    expect(error.statusCode).toBe(400);
    expect(error.issues).toEqual([{ path: 'variations.0', message: 'wrong type' }]);
    expect(error.message).toContain('The flag is invalid.');
  });

  it('treats a stale version as a conflict and a reference failure as a plain 409', () => {
    const stale = toFeatureFlagsApiError(
      new FakeHttpError(409, {
        message: 'The flag [theme] was changed by someone else. Reload it and try again.',
      })
    );
    const referenced = toFeatureFlagsApiError(
      new FakeHttpError(409, {
        message:
          'The environment [production] is used by 2 flag(s). Remove it from those flags first.',
      })
    );

    expect(isVersionConflict(stale)).toBe(true);
    expect(isVersionConflict(referenced)).toBe(false);
  });
});
