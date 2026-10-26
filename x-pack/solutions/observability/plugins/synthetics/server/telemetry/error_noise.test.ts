/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getErrorThrottleKey, isNoisyError } from './error_noise';

describe('isNoisyError', () => {
  it.each([
    ['loopback IPv4 url', { url: 'http://127.0.0.1:1', message: 'connect ECONNREFUSED' }],
    ['localhost url', { url: 'https://localhost:8080', message: 'boom' }],
    ['IPv6 loopback url', { url: 'http://[::1]:9', message: 'boom' }],
    [
      'expired license',
      { message: 'Cannot sync monitors with the Synthetics service. License is expired.' },
    ],
    [
      'missing shards',
      { message: 'search_phase_execution_exception: Search rejected due to missing shards' },
    ],
    [
      'disk flood-stage',
      { message: 'blocked by: [TOO_MANY_REQUESTS/12/disk usage exceeded flood-stage watermark]' },
    ],
    ['TLS timeout', { message: 'TLS handshake timeout: Put "https://10.0.0.1:9200"' }],
  ])('flags %s', (_name, event) => {
    expect(isNoisyError(event)).toBe(true);
  });

  it.each([
    [
      'public service url',
      { url: 'https://synthetics.example.com', message: 'connect ECONNREFUSED' },
    ],
    ['unparseable url', { url: 'not a url', message: 'boom' }],
    ['plain failure', { message: 'Failed to push configs. API key is not valid.' }],
  ])('keeps %s', (_name, event) => {
    expect(isNoisyError(event)).toBe(false);
  });
});

describe('getErrorThrottleKey', () => {
  it('shares a key across messages that differ only by numbers', () => {
    const key = (minutes: number) =>
      getErrorThrottleKey({
        type: 'syncTaskMissedSchedule',
        message: `sync task has missed its schedule, it last ran ${minutes} minutes ago.`,
      });
    expect(key(15)).toBe(key(19));
  });

  it('separates error types', () => {
    expect(getErrorThrottleKey({ type: 'a', message: 'x' })).not.toBe(
      getErrorThrottleKey({ type: 'b', message: 'x' })
    );
  });
});
