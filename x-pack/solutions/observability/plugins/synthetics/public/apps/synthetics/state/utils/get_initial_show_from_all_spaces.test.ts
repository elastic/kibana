/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialShowFromAllSpaces } from './get_initial_show_from_all_spaces';

describe('getInitialShowFromAllSpaces', () => {
  const originalLocation = window.location;

  function setPathname(pathname: string) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, pathname },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  it('returns false when localStorage has no entry (default space)', () => {
    setPathname('/app/synthetics/monitors');
    expect(getInitialShowFromAllSpaces()).toBe(false);
  });

  it('returns false when localStorage has no entry (custom space)', () => {
    setPathname('/s/test/app/synthetics/monitors');
    expect(getInitialShowFromAllSpaces()).toBe(false);
  });

  it('reads `true` from localStorage for the default space', () => {
    setPathname('/app/synthetics/monitors');
    localStorage.setItem('SyntheticsShowFromAllSpacesdefault', JSON.stringify(true));
    expect(getInitialShowFromAllSpaces()).toBe(true);
  });

  it('reads `false` from localStorage for the default space', () => {
    setPathname('/app/synthetics/monitors');
    localStorage.setItem('SyntheticsShowFromAllSpacesdefault', JSON.stringify(false));
    expect(getInitialShowFromAllSpaces()).toBe(false);
  });

  it('reads from the correct space-specific key for /s/{spaceId}/ URLs', () => {
    setPathname('/s/my-space/app/synthetics/monitors');
    localStorage.setItem('SyntheticsShowFromAllSpacesmy-space', JSON.stringify(true));
    expect(getInitialShowFromAllSpaces()).toBe(true);
  });

  it('does not cross-read between spaces', () => {
    setPathname('/s/space-a/app/synthetics/monitors');
    localStorage.setItem('SyntheticsShowFromAllSpacesspace-b', JSON.stringify(true));
    expect(getInitialShowFromAllSpaces()).toBe(false);
  });

  it('returns false for corrupted localStorage values', () => {
    setPathname('/app/synthetics/monitors');
    localStorage.setItem('SyntheticsShowFromAllSpacesdefault', 'not-json{');
    expect(getInitialShowFromAllSpaces()).toBe(false);
  });

  it('returns false when the stored value is not boolean `true`', () => {
    setPathname('/app/synthetics/monitors');
    localStorage.setItem('SyntheticsShowFromAllSpacesdefault', JSON.stringify('yes'));
    expect(getInitialShowFromAllSpaces()).toBe(false);
  });

  it('always returns a boolean, never undefined', () => {
    setPathname('/app/synthetics/monitors');
    const result = getInitialShowFromAllSpaces();
    expect(typeof result).toBe('boolean');
  });
});
