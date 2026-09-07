/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { isMissingIndexError } from './is_missing_index_error';

describe('isMissingIndexError', () => {
  it.each([
    ['index_not_found_exception', 'lookup-index', 404, true],
    ['index_not_found_exception', 'another-index', 404, false],
    ['resource_not_found_exception', 'lookup-index', 404, false],
    ['security_exception', 'lookup-index', 403, false],
  ])('handles %s for %s with status %s', (type, index, statusCode, expected) => {
    const error = new errors.ResponseError({
      body: { error: { type, index } },
      statusCode,
      warnings: [],
      meta: {
        context: null,
        name: 'test',
        request: {
          id: 1,
          params: { method: 'GET', path: '/', headers: {}, querystring: '' },
          options: {},
        },
        connection: null,
        attempts: 0,
        aborted: false,
      },
    });
    expect(isMissingIndexError(error, 'lookup-index')).toBe(expected);
  });

  it('preserves other errors', () => {
    expect(isMissingIndexError(new Error('Unavailable'), 'lookup-index')).toBe(false);
  });
});
