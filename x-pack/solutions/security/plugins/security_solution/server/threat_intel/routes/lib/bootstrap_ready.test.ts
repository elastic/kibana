/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { rejectUntilBootstrapped } from './bootstrap_ready';

describe('rejectUntilBootstrapped', () => {
  const response = httpServerMock.createResponseFactory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the handler proceed once bootstrap has resolved', async () => {
    const result = await rejectUntilBootstrapped(() => Promise.resolve(), response);

    expect(result).toBeUndefined();
    expect(response.customError).not.toHaveBeenCalled();
  });

  it('waits for a pending bootstrap rather than proceeding immediately', async () => {
    let settle: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
    let resolved = false;

    const gate = rejectUntilBootstrapped(() => pending, response).then((r) => {
      resolved = true;
      return r;
    });

    // Still in flight: a request arriving during startup must not fall through
    // and auto-create an index before its template applies.
    await Promise.resolve();
    expect(resolved).toBe(false);

    settle();
    await expect(gate).resolves.toBeUndefined();
  });

  it('answers 503 when bootstrap failed, naming the cause', async () => {
    await rejectUntilBootstrapped(
      () => Promise.reject(new Error('templates never installed')),
      response
    );

    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(response.customError.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        statusCode: 503,
        body: expect.objectContaining({
          message: expect.stringContaining('templates never installed'),
        }),
      })
    );
  });
});
