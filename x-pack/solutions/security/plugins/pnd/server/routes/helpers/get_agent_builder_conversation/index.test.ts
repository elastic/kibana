/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfGet } from '../../get/conversations/helpers/scoped_self_get';
import { getAgentBuilderConversation } from '.';

jest.mock('../../get/conversations/helpers/scoped_self_get');

const scopedSelfGetMock = scopedSelfGet as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;

const params = { conversationId: 'c-1', http, request, spaceId: 'agent-1' };

describe('getAgentBuilderConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the conversation by id, at the public API version', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: { id: 'c-1' }, status: 200 });

    await getAgentBuilderConversation(params);

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/agent_builder/conversations/c-1',
        request,
        spaceId: 'agent-1',
        version: '2023-10-31',
      })
    );
  });

  it('reports a readable conversation as existing', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: { id: 'c-1' }, status: 200 });

    expect(await getAgentBuilderConversation(params)).toEqual({
      conversation: { id: 'c-1' },
      exists: true,
      status: 200,
    });
  });

  it('reports a 404 as not existing', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 404 });

    expect(await getAgentBuilderConversation(params)).toEqual({
      conversation: undefined,
      exists: false,
      status: 404,
    });
  });

  it('reports a 403 as not existing, keeping existence non-observable', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 403 });

    expect(await getAgentBuilderConversation(params)).toEqual({
      conversation: undefined,
      exists: false,
      status: 403,
    });
  });

  it('propagates a transport error so the caller can map it to a 500', async () => {
    scopedSelfGetMock.mockRejectedValue(new Error('boom'));

    await expect(getAgentBuilderConversation(params)).rejects.toThrow('boom');
  });
});
