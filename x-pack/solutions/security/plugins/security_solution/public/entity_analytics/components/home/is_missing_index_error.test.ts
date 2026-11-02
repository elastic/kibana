/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMissingIndexError } from './is_missing_index_error';

describe('isMissingIndexError', () => {
  it('matches both phrasings of a missing index', () => {
    expect(isMissingIndexError(new Error('Unknown index [.alerts-security.alerts-default]'))).toBe(
      true
    );
    expect(
      isMissingIndexError(new Error('no such index [.alerts-security.alerts-test-space-1]'))
    ).toBe(true);
  });

  it('leaves a real query error alone', () => {
    expect(isMissingIndexError(new Error('Found 2 problems'))).toBe(false);
    expect(isMissingIndexError(undefined)).toBe(false);
  });
});
