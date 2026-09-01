/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersonaMatrixChatClient } from './chat_client';

describe('PersonaMatrixChatClient provenance', () => {
  it('persists null sampling controls and hashes tool_id + params, not provider call ids', async () => {
    const fetch = jest.fn().mockResolvedValue({
      response: { message: 'done' },
      steps: [
        { type: 'tool_call', tool_id: 'search', tool_call_id: 'toolu_A', params: { q: 'x' } },
      ],
    });
    const log = { warning: jest.fn() };
    const client = new PersonaMatrixChatClient(fetch, log as never, 'connector-1');

    const first = await client.query('q');
    fetch.mockResolvedValue({
      response: { message: 'done' },
      steps: [
        { type: 'tool_call', tool_id: 'search', tool_call_id: 'toolu_B', params: { q: 'x' } },
      ],
    });
    const second = await client.query('q');

    expect(first.sampling).toEqual({
      connectorId: 'connector-1',
      temperature: null,
      topP: null,
      seed: null,
    });
    expect(first.trajectoryFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(second.trajectoryFingerprint).toBe(first.trajectoryFingerprint);
  });
});
