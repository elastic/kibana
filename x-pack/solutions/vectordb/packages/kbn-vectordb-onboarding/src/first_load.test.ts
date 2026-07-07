/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSeenOnboarding, markOnboardingSeen } from './first_load';
import { ONBOARDING_SEEN_STORAGE_KEY } from './storage_keys';

beforeEach(() => {
  localStorage.clear();
});

describe('hasSeenOnboarding', () => {
  it('returns false when the key is absent', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('returns true after markOnboardingSeen sets the key', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('returns false when the key exists but is not "true"', () => {
    localStorage.setItem(ONBOARDING_SEEN_STORAGE_KEY, 'false');
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('returns true when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(hasSeenOnboarding()).toBe(true);
  });
});

describe('markOnboardingSeen', () => {
  it('writes "true" under the expected key', () => {
    markOnboardingSeen();
    expect(localStorage.getItem(ONBOARDING_SEEN_STORAGE_KEY)).toBe('true');
  });

  it('does not throw when localStorage throws', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable');
    });
    expect(() => markOnboardingSeen()).not.toThrow();
  });
});
