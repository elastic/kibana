/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { createInvestigation, waitForConversationsReady } from './investigation';

describe('createInvestigation', () => {
  it('returns a conversation created as public so the workflow API key can read it', async () => {
    const fetch = jest.fn().mockResolvedValue({});
    await createInvestigation(fetch as unknown as HttpHandler, 'title');
    expect(JSON.parse(fetch.mock.calls[0][1].body).access_control).toEqual({
      access_mode: 'public',
      entries: [],
    });
  });
});

const shardError = new Error(
  '500 Internal Server Error -- no_shard_available_action_exception: No shard available'
);

describe('waitForConversationsReady', () => {
  const options = { maxAttempts: 3, retryDelayMs: 0 };
  let fetch: jest.Mock;

  beforeEach(() => {
    fetch = jest.fn();
  });

  it('returns once a probe conversation is created and deleted', async () => {
    fetch.mockRejectedValueOnce(shardError).mockResolvedValue({});
    await waitForConversationsReady(fetch as unknown as HttpHandler, options);
    expect(fetch.mock.calls.map(([, init]) => init.method)).toEqual(['POST', 'POST', 'DELETE']);
  });

  it('throws other errors without retrying', async () => {
    fetch.mockRejectedValue(new Error('403 Forbidden'));
    await expect(
      waitForConversationsReady(fetch as unknown as HttpHandler, options)
    ).rejects.toThrow('403 Forbidden');
  });

  it('throws the shard error after the last attempt', async () => {
    fetch.mockRejectedValue(shardError);
    await expect(
      waitForConversationsReady(fetch as unknown as HttpHandler, options)
    ).rejects.toThrow('no_shard_available_action_exception');
  });
});
