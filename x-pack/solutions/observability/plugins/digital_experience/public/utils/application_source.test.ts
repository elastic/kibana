/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applicationPlatformRt,
  applicationSourceRt,
  DEFAULT_APPLICATION_SOURCE,
} from './application_source';

describe('applicationSourceRt', () => {
  it.each(['otel', 'classic'])('accepts %s, so the router keeps it', (source) => {
    expect(applicationSourceRt.is(source)).toBe(true);
  });

  it('rejects other values, mobile included, which the router replaces with the default', () => {
    // Mobile applications are EDOT data: `otel` with a mobile platform.
    expect(applicationSourceRt.is('mobile')).toBe(false);
    expect(applicationSourceRt.is('ios')).toBe(false);
    expect(DEFAULT_APPLICATION_SOURCE).toBe('classic');
  });
});

describe('applicationPlatformRt', () => {
  it.each(['browser', 'android', 'ios'])('accepts %s', (platform) => {
    expect(applicationPlatformRt.is(platform)).toBe(true);
  });

  it('rejects iPadOS, which is the iOS platform, and other values', () => {
    expect(applicationPlatformRt.is('ipados')).toBe(false);
    expect(applicationPlatformRt.is('mobile')).toBe(false);
  });
});
