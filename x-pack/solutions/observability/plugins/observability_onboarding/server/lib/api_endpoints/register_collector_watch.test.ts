/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { registerCollectorWatch } from './register_collector_watch';

const mockFetch = jest.fn();
const mockTimeout = jest.fn(() => 'timeout-signal' as unknown as AbortSignal);
const originalFetch = global.fetch;
const originalAbortSignalTimeout = AbortSignal.timeout;

const input = {
  collectorWatchUrl: 'https://collector.example',
  token: 'k2c',
  body: {
    targetType: 'hosted',
    targetId: 'dep-1',
    apiKeyId: 'key-1',
    verificationId: 'obs-onb-1',
    expiresAt: '2026-07-07T17:45:00.000Z',
  },
  logger: loggerMock.create(),
};

describe('registerCollectorWatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    AbortSignal.timeout = mockTimeout;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    AbortSignal.timeout = originalAbortSignalTimeout;
  });

  it('posts to the watch endpoint with a bearer token and returns true on 2xx', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const ok = await registerCollectorWatch(input);
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://collector.example/internal/onboarding_receipt/watch',
      expect.objectContaining({
        body: JSON.stringify(input.body),
        headers: {
          Authorization: 'Bearer k2c',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: 'timeout-signal',
      })
    );
    expect(mockTimeout).toHaveBeenCalledWith(4000);
  });

  it('normalizes trailing slashes in collectorWatchUrl', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const ok = await registerCollectorWatch({
      ...input,
      collectorWatchUrl: 'https://collector.example///',
    });
    expect(ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://collector.example/internal/onboarding_receipt/watch',
      expect.objectContaining({
        body: JSON.stringify(input.body),
        headers: {
          Authorization: 'Bearer k2c',
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: 'timeout-signal',
      })
    );
  });

  it('returns false without logging when fetch resolves with a non-2xx status', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const ok = await registerCollectorWatch(input);
    expect(ok).toBe(false);
    expect(input.logger.warn).not.toHaveBeenCalled();
  });

  it('returns false and logs without the token on failure', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const ok = await registerCollectorWatch(input);
    expect(ok).toBe(false);
    expect(input.logger.warn).toHaveBeenCalledTimes(1);
    const logged = (input.logger.warn as jest.Mock).mock.calls[0][0] as string;
    expect(logged).toContain('obs-onb-1');
    expect(logged).toContain('ECONNREFUSED');
    expect(logged).not.toContain('k2c');
  });
});
