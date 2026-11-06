/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TIME_RANGE_MS, withTimeRangeGuardrail } from './time_range_guardrail';

const FROM = '2026-11-01T00:00:00.000Z';
const at = (offsetMs: number): string => new Date(Date.parse(FROM) + offsetMs).toISOString();

describe('withTimeRangeGuardrail', () => {
  it('caps the window at 72 hours', () => {
    expect(MAX_TIME_RANGE_MS).toBe(72 * 60 * 60 * 1000);
  });

  it('calls the handler with its options for a window of exactly 72 hours', async () => {
    const handler = jest.fn().mockResolvedValue('rows');
    const options = { params: { body: { from: FROM, to: at(MAX_TIME_RANGE_MS) } } };

    await expect(withTimeRangeGuardrail(handler)(options)).resolves.toBe('rows');
    expect(handler).toHaveBeenCalledWith(options);
  });

  it('rejects a window 1ms over 72 hours with InventoryRequestError, without calling the handler', async () => {
    const handler = jest.fn();
    const to = at(MAX_TIME_RANGE_MS + 1);

    await expect(
      withTimeRangeGuardrail(handler)({ params: { body: { from: FROM, to } } })
    ).rejects.toMatchObject({
      name: 'InventoryRequestError',
      statusCode: 400,
      message: `the time range from ${FROM} to ${to} is longer than the maximum of 72 hours`,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('measures the window across offsets', async () => {
    const handler = jest.fn().mockResolvedValue('rows');
    // 72h in UTC, written with different offsets.
    const options = {
      params: { body: { from: '2026-11-01T02:00:00+02:00', to: '2026-11-03T19:00:00-05:00' } },
    };

    await expect(withTimeRangeGuardrail(handler)(options)).resolves.toBe('rows');
  });
});
