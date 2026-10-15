/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('Nightshift investigations configuration', () => {
  it('enables Cortex by default', () => {
    expect(config.schema.validate({ cortex: {} }).cortex.enabled).toBe(true);
  });

  it('preserves an explicit Cortex opt-out', () => {
    expect(config.schema.validate({ cortex: { enabled: false } }).cortex.enabled).toBe(false);
  });

  const UIAM_DEFAULTS = {
    enabled: false,
    assumer_service_account_id: 'sandbox-api',
    roles: ['nightshift'],
    service_account_name: 'nightshift-sandbox',
  };

  it('enables the request-scoped Elasticsearch connector by default, with UIAM mode off', () => {
    expect(config.schema.validate({ sandbox: {} }).sandbox?.elasticsearch).toEqual({
      enabled: true,
      uiam: UIAM_DEFAULTS,
    });
  });

  it('accepts a UIAM mode override', () => {
    expect(
      config.schema.validate({
        sandbox: {
          elasticsearch: {
            uiam: { enabled: true, assumer_service_account_id: 'sbx', roles: ['viewer'] },
          },
        },
      }).sandbox?.elasticsearch.uiam
    ).toEqual({
      ...UIAM_DEFAULTS,
      enabled: true,
      assumer_service_account_id: 'sbx',
      roles: ['viewer'],
    });
  });

  it('rejects UIAM mode without roles', () => {
    expect(() =>
      config.schema.validate({ sandbox: { elasticsearch: { uiam: { roles: [] } } } })
    ).toThrow();
  });

  it('accepts an opt-out and a sandbox-reachable Elasticsearch URL', () => {
    expect(
      config.schema.validate({
        sandbox: { elasticsearch: { enabled: false, url: 'https://es.example.com' } },
      }).sandbox?.elasticsearch
    ).toEqual({ enabled: false, url: 'https://es.example.com', uiam: UIAM_DEFAULTS });
  });

  it('rejects a non-http Elasticsearch URL', () => {
    expect(() =>
      config.schema.validate({ sandbox: { elasticsearch: { url: 'ftp://es.example.com' } } })
    ).toThrow();
  });
});
