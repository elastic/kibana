/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../../../common/constants';
import { hasValidIndexPattern } from './has_valid_index_pattern';

describe('hasValidIndexPattern', () => {
  it('is false when index pattern is undefined, empty, or the migration placeholder', () => {
    expect(hasValidIndexPattern(undefined)).toBe(false);
    expect(hasValidIndexPattern('')).toBe(false);
    expect(hasValidIndexPattern(MISSING_INDEX_PATTERN_PLACEHOLDER)).toBe(false);
  });

  it('is true when a concrete index pattern is present', () => {
    expect(hasValidIndexPattern('logs-*')).toBe(true);
    expect(hasValidIndexPattern('logs-windows-*')).toBe(true);
  });
});
