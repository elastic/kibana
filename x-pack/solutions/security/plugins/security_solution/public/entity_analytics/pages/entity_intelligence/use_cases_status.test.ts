/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUseCaseStatus } from './use_cases_status';

describe('use case evidence status', () => {
  it('does not infer missing configuration while loading', () => {
    expect(getUseCaseStatus({ isLoading: true, isActive: false })).toBe('loading');
  });
  it('does not present stale success after a failed refresh', () => {
    expect(getUseCaseStatus({ isLoading: false, isError: true, isActive: true })).toBe(
      'unavailable'
    );
  });
  it('requires known evidence before reporting configuration', () => {
    expect(getUseCaseStatus({ isLoading: false, isActive: undefined })).toBe('unavailable');
    expect(getUseCaseStatus({ isLoading: false, isActive: false })).toBe('not_configured');
    expect(getUseCaseStatus({ isLoading: false, isActive: true })).toBe('active');
  });
});
