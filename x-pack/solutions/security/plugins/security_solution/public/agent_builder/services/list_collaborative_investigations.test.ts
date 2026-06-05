/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_PUBLIC_API } from '../constants';
import { listCollaborativeInvestigations } from './list_collaborative_investigations';

describe('listCollaborativeInvestigations', () => {
  const httpGet = jest.fn();
  const http = {
    get: httpGet,
  } as unknown as HttpSetup;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters and sorts collaborative investigations', async () => {
    const collaborative: ConversationWithoutRounds = {
      id: 'collab-1',
      agent_id: 'agent',
      user: { id: 'u1', username: 'analyst' },
      title: 'Incident A',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-03T00:00:00.000Z',
      chat_mode: 'collaborative',
    };
    const personal: ConversationWithoutRounds = {
      id: 'personal-1',
      agent_id: 'agent',
      user: { id: 'u1', username: 'analyst' },
      title: 'Personal chat',
      created_at: '2026-01-02T00:00:00.000Z',
      updated_at: '2026-01-04T00:00:00.000Z',
      chat_mode: 'single',
    };

    httpGet.mockResolvedValue({ results: [personal, collaborative] });

    const results = await listCollaborativeInvestigations({ http });

    expect(httpGet).toHaveBeenCalledWith(`${AGENT_BUILDER_PUBLIC_API}/conversations`, {
      version: '2023-10-31',
    });
    expect(results).toEqual([collaborative]);
  });
});
