/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applicationSourceRt,
  applicationTypeRt,
  DEFAULT_APPLICATION_SOURCE,
  mobilePlatformRt,
} from './application_source';

describe('applicationSourceRt', () => {
  it.each(['otel', 'classic'])('accepts %s, so the router keeps it', (source) => {
    expect(applicationSourceRt.is(source)).toBe(true);
  });

  it('rejects other values, mobile included, which the router replaces with the default', () => {
    // Mobile applications are EDOT data: `otel` of the mobile type.
    expect(applicationSourceRt.is('mobile')).toBe(false);
    expect(applicationSourceRt.is('ios')).toBe(false);
    expect(DEFAULT_APPLICATION_SOURCE).toBe('classic');
  });
});

describe('applicationTypeRt', () => {
  it.each(['web', 'mobile'])('accepts %s', (applicationType) => {
    expect(applicationTypeRt.is(applicationType)).toBe(true);
  });

  it('rejects other values', () => {
    expect(applicationTypeRt.is('android')).toBe(false);
  });
});

describe('mobilePlatformRt', () => {
  it.each(['android', 'ios'])('accepts %s', (platform) => {
    expect(mobilePlatformRt.is(platform)).toBe(true);
  });

  it('rejects iPadOS, which is the iOS platform, and the browser', () => {
    expect(mobilePlatformRt.is('ipados')).toBe(false);
    expect(mobilePlatformRt.is('browser')).toBe(false);
  });
});
