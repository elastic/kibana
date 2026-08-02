/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config, configSchema } from './config';

describe('configSchema', () => {
  it('defaults xpack.pnd.demo.forceIncident to false', () => {
    expect(configSchema.validate({}).demo.forceIncident).toBe(false);
  });

  it('defaults xpack.pnd.enabled to false', () => {
    expect(configSchema.validate({}).enabled).toBe(false);
  });

  it('defaults xpack.pnd.ui.useMockData to false', () => {
    expect(configSchema.validate({}).ui.useMockData).toBe(false);
  });

  it('accepts an explicitly enabled demo switch', () => {
    expect(configSchema.validate({ demo: { forceIncident: true } }).demo.forceIncident).toBe(true);
  });

  // `schema.boolean()` deliberately accepts the strings 'true'/'false' so an env var can set it;
  // anything else must fail loudly rather than land as a truthy value.
  it('rejects a non-boolean demo switch', () => {
    expect(() => configSchema.validate({ demo: { forceIncident: 'sometimes' } })).toThrow();
  });
});

describe('config descriptor', () => {
  it('exposes the demo switch to the browser so the UI can badge a staged run', () => {
    expect(config.exposeToBrowser?.demo).toBe(true);
  });

  it('still exposes enabled to the browser', () => {
    expect(config.exposeToBrowser?.enabled).toBe(true);
  });

  it('still exposes ui to the browser', () => {
    expect(config.exposeToBrowser?.ui).toBe(true);
  });
});
