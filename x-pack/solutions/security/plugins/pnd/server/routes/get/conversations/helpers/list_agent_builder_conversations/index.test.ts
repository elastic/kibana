/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfGet } from '../scoped_self_get';
import { AGENT_BUILDER_CONVERSATIONS_PATH } from '../../../../helpers/agent_builder_api';
import { listAgentBuilderConversations } from '.';

jest.mock('../scoped_self_get');

const scopedSelfGetMock = scopedSelfGet as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;

describe('listAgentBuilderConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scopedSelfGetMock.mockResolvedValue({ body: { results: [{ id: 'c-1' }] }, status: 200 });
  });

  it('lists conversations as the calling user in the request space', async () => {
    await listAgentBuilderConversations({ http, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        http,
        path: AGENT_BUILDER_CONVERSATIONS_PATH,
        request,
        spaceId: 'agent-3',
      })
    );
  });

  it('returns the conversations from the response results', async () => {
    const result = await listAgentBuilderConversations({ http, request, spaceId: 'agent-3' });

    expect(result).toEqual([{ id: 'c-1' }]);
  });

  it('returns an empty array for a non-2xx response', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 403 });

    const result = await listAgentBuilderConversations({ http, request, spaceId: 'agent-3' });

    expect(result).toEqual([]);
  });

  it('returns an empty array when the response has no results', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: {}, status: 200 });

    const result = await listAgentBuilderConversations({ http, request, spaceId: 'agent-3' });

    expect(result).toEqual([]);
  });
});
