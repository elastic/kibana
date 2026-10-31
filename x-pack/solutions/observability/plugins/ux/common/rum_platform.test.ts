/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  preferRumAppPlatform,
  platformKeysForInventory,
  resolveRumAppPlatform,
} from './rum_platform';

describe('resolveRumAppPlatform', () => {
  it('detects android from rum.platform or os.type', () => {
    expect(resolveRumAppPlatform(['android'])).toBe('android');
    expect(resolveRumAppPlatform(['Android'])).toBe('android');
    expect(resolveRumAppPlatform(['web', 'android'])).toBe('android');
  });

  it('detects ios', () => {
    expect(resolveRumAppPlatform(['iOS'])).toBe('ios');
    expect(resolveRumAppPlatform(['iPadOS'])).toBe('ios');
  });

  it('defaults to web', () => {
    expect(resolveRumAppPlatform([])).toBe('web');
    expect(resolveRumAppPlatform(['web', 'macOS'])).toBe('web');
  });
});

describe('platformKeysForInventory', () => {
  it('uses rum.platform and ignores visitor os.name', () => {
    expect(
      resolveRumAppPlatform(
        platformKeysForInventory({
          rumPlatform: ['web'],
          attrPlatform: [],
          osType: [],
          osName: ['Android', 'Mac OS X'],
          hasWebVitals: true,
        })
      )
    ).toBe('web');
  });

  it('treats session-index web vitals as web even when os.name is Android', () => {
    expect(
      resolveRumAppPlatform(
        platformKeysForInventory({
          rumPlatform: [],
          attrPlatform: [],
          osType: [],
          osName: ['Android', 'Windows'],
          hasWebVitals: true,
        })
      )
    ).toBe('web');
  });

  it('uses the top os.name for native apps with no vitals', () => {
    expect(
      resolveRumAppPlatform(
        platformKeysForInventory({
          rumPlatform: [],
          attrPlatform: [],
          osType: [],
          osName: ['Android'],
          hasWebVitals: false,
        })
      )
    ).toBe('android');
  });
});

describe('preferRumAppPlatform', () => {
  it('keeps android when merging a web bucket', () => {
    expect(preferRumAppPlatform('android', 'web')).toBe('android');
    expect(preferRumAppPlatform('web', 'android')).toBe('android');
  });
});
