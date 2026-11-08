/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { canCreateShortUrl, canManageSessions, canSaveViews } from './capabilities';

const capabilities = (digitalExperience: Record<string, boolean>): Capabilities =>
  ({
    navLinks: {},
    management: {},
    catalogue: {},
    digital_experience: digitalExperience,
  } as Capabilities);

describe('canSaveViews', () => {
  it('is granted with the save privilege of the feature, which `all` has', () => {
    expect(canSaveViews(capabilities({ show: true, save: true }))).toBe(true);
  });

  it('is not granted with read access only, or without the feature', () => {
    expect(canSaveViews(capabilities({ show: true, save: false }))).toBe(false);
    expect(canSaveViews(capabilities({ show: true }))).toBe(false);
    expect(canSaveViews({ navLinks: {}, management: {}, catalogue: {} } as Capabilities)).toBe(
      false
    );
  });
});

describe('canCreateShortUrl', () => {
  it('is granted by its own sub-feature privilege, not by saving views', () => {
    expect(canCreateShortUrl(capabilities({ createShortUrl: true }))).toBe(true);
    expect(canCreateShortUrl(capabilities({ save: true }))).toBe(false);
    expect(canCreateShortUrl(capabilities({ show: true, createShortUrl: false }))).toBe(false);
  });
});

describe('canManageSessions', () => {
  it('is granted by its own sub-feature privilege, not by saving views', () => {
    expect(canManageSessions(capabilities({ manageSessions: true }))).toBe(true);
    expect(canManageSessions(capabilities({ save: true }))).toBe(false);
  });
});
