/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfPost } from '../../../../helpers/scoped_self_post';
import { createPndConversation } from '.';

jest.mock('../../../../helpers/scoped_self_post');

const scopedSelfPostMock = scopedSelfPost as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;

const params = {
  agentId: 'pnd.detection_tuning',
  conversationId: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001',
  http,
  request,
  spaceId: 'agent-1',
  title: 'Decision on applying a detection rule change: Coordinated credential theft',
};

describe('createPndConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scopedSelfPostMock.mockResolvedValue({ body: undefined, status: 200 });
  });

  it('posts to the public conversation create route', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/agent_builder/conversations',
        version: '2023-10-31',
      })
    );
  });

  it('creates the conversation at the derived thread id', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock.mock.calls[0][0].body).toEqual(
      expect.objectContaining({ conversation_id: 'a1c2022a-57ea-5afa-a7fa-c85ff30b0001' })
    );
  });

  it('sets the title at creation', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock.mock.calls[0][0].body).toEqual(
      expect.objectContaining({ title: params.title })
    );
  });

  it('creates the thread as a public conversation, so every analyst can see it', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock.mock.calls[0][0].body).toEqual(
      expect.objectContaining({ access_control: { access_mode: 'public' } })
    );
  });

  it('names the installed PND agent when there is one', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock.mock.calls[0][0].body).toEqual(
      expect.objectContaining({ agent_id: 'pnd.detection_tuning' })
    );
  });

  it('omits agent_id entirely when the agents were not ensured (ADR-011)', async () => {
    await createPndConversation({ ...params, agentId: undefined });

    expect(scopedSelfPostMock.mock.calls[0][0].body).not.toHaveProperty('agent_id');
  });

  it('sends no message, so minting cannot start an LLM turn', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock.mock.calls[0][0].body).not.toHaveProperty('input');
    expect(scopedSelfPostMock.mock.calls[0][0].body).not.toHaveProperty('message');
  });

  it('inherits the self-client timeout, because create is not an LLM turn', async () => {
    await createPndConversation(params);

    expect(scopedSelfPostMock.mock.calls[0][0]).not.toHaveProperty('timeout');
  });

  it('returns a non-2xx as a status rather than throwing', async () => {
    scopedSelfPostMock.mockResolvedValue({ body: undefined, status: 409 });

    expect(await createPndConversation(params)).toEqual({ status: 409 });
  });
});
