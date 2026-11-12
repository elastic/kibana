/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkOtlpEndpoint } from './ingest_utils';

describe('checkOtlpEndpoint', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('cancels the unread body and treats 405 as reachable', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ status: 405, ok: false, body: { cancel } }) as typeof fetch;

    await expect(checkOtlpEndpoint('http://otlp.example')).resolves.toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('cancels the unread body when the endpoint is down', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ status: 500, ok: false, body: { cancel } }) as typeof fetch;

    await expect(checkOtlpEndpoint('http://otlp.example')).resolves.toBe(false);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
