/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { createConversationTitlesClient } from './conversation_titles_client';

const makeConversationsClient = (getById: (id: string) => Promise<{ title: string }>) => ({
  getScopedClient: jest.fn().mockResolvedValue({ get: jest.fn().mockImplementation(getById) }),
});

const makeAgentBuilder = (
  getById: (id: string) => Promise<{ title: string }>
): AgentBuilderPluginStart =>
  ({
    conversations: makeConversationsClient(getById),
  } as unknown as AgentBuilderPluginStart);

describe('createConversationTitlesClient', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns titles for ids it can read', async () => {
    const agentBuilder = makeAgentBuilder(async (id) => ({ title: `Title for ${id}` }));
    const client = createConversationTitlesClient({ agentBuilder, request, logger });

    const map = await client.getTitles(['a', 'b']);

    expect(map.get('a')).toBe('Title for a');
    expect(map.get('b')).toBe('Title for b');
  });

  it('deduplicates ids before fetching', async () => {
    const getScopedClient = jest.fn().mockResolvedValue({
      get: jest.fn().mockResolvedValue({ title: 'T' }),
    });
    const agentBuilder = {
      conversations: { getScopedClient },
    } as unknown as AgentBuilderPluginStart;
    const client = createConversationTitlesClient({ agentBuilder, request, logger });

    await client.getTitles(['x', 'x', 'x']);

    const get = (await getScopedClient.mock.results[0].value).get as jest.Mock;
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('omits an id from the result when the fetch rejects', async () => {
    const agentBuilder = makeAgentBuilder(async (id) => {
      if (id === 'bad') throw new Error('not found');
      return { title: `Title for ${id}` };
    });
    const client = createConversationTitlesClient({ agentBuilder, request, logger });

    const map = await client.getTitles(['good', 'bad']);

    expect(map.get('good')).toBe('Title for good');
    expect(map.has('bad')).toBe(false);
  });

  it('does not reject the whole call when one id fails', async () => {
    const agentBuilder = makeAgentBuilder(async () => {
      throw new Error('always fails');
    });
    const client = createConversationTitlesClient({ agentBuilder, request, logger });

    await expect(client.getTitles(['a', 'b'])).resolves.toEqual(new Map());
  });

  it('returns an empty map for an empty input', async () => {
    const agentBuilder = makeAgentBuilder(async () => ({ title: 'T' }));
    const client = createConversationTitlesClient({ agentBuilder, request, logger });

    const map = await client.getTitles([]);

    expect(map.size).toBe(0);
  });
});
