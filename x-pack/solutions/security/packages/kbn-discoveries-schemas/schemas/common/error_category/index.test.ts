/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ERROR_CATEGORIES } from '.';
import type { ErrorCategory } from '.';

const ALL_CATEGORIES: ErrorCategory[] = [
  'anonymization_error',
  'cluster_health',
  'concurrent_conflict',
  'connector_error',
  'network_error',
  'permission_error',
  'rate_limit',
  'step_registration_error',
  'timeout',
  'unknown',
  'validation_error',
  'workflow_deleted',
  'workflow_disabled',
  'workflow_error',
  'workflow_invalid',
];

describe('ERROR_CATEGORIES', () => {
  it('contains exactly 15 categories', () => {
    expect(Object.keys(ERROR_CATEGORIES)).toHaveLength(15);
  });

  it('has keys that match their values', () => {
    for (const [key, value] of Object.entries(ERROR_CATEGORIES)) {
      expect(key).toBe(value);
    }
  });

  it('contains all expected category values', () => {
    const values = Object.values(ERROR_CATEGORIES);

    for (const category of ALL_CATEGORIES) {
      expect(values).toContain(category);
    }
  });

  it('values are stable strings (no spaces, lowercase with underscores)', () => {
    for (const value of Object.values(ERROR_CATEGORIES)) {
      expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

describe('ErrorCategory type', () => {
  it('can be assigned from any ERROR_CATEGORIES value', () => {
    // Compile-time check: assigning each const value to ErrorCategory should be valid.
    const check = (category: ErrorCategory): ErrorCategory => category;

    for (const value of Object.values(ERROR_CATEGORIES)) {
      expect(check(value)).toBe(value);
    }
  });
});
