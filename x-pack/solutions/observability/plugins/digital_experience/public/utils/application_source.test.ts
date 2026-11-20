/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applicationSourceRt, DEFAULT_APPLICATION_SOURCE } from './application_source';

describe('applicationSourceRt', () => {
  it.each(['otel', 'classic', 'mobile'])('accepts %s, so the router keeps it', (source) => {
    expect(applicationSourceRt.is(source)).toBe(true);
  });

  it('rejects other values, which the router replaces with the default', () => {
    expect(applicationSourceRt.is('ios')).toBe(false);
    expect(DEFAULT_APPLICATION_SOURCE).toBe('classic');
  });
});
