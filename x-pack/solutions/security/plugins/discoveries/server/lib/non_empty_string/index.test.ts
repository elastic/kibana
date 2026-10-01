/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asNonEmpty } from '.';

describe('asNonEmpty', () => {
  it('returns undefined for an empty string', () => {
    expect(asNonEmpty('')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(asNonEmpty(undefined)).toBeUndefined();
  });

  it('returns the string typed as NonEmptyString for a truthy value', () => {
    expect(asNonEmpty('hello')).toBe('hello');
  });

  it('returns the string typed as NonEmptyString for a dot-prefixed value', () => {
    expect(asNonEmpty('.inference')).toBe('.inference');
  });
});
