/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfGet } from '../../get/conversations/helpers/scoped_self_get';
import { listAgentBuilderAttachments } from '.';

jest.mock('../../get/conversations/helpers/scoped_self_get');

const scopedSelfGetMock = scopedSelfGet as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;

const params = { conversationId: 'c-1', http, request, spaceId: 'agent-1' };

const ATTACHMENT = {
  current_version: 1,
  description: 'Attack Discovery',
  id: 'pnd-attack-discovery',
  type: 'text',
  versions: [
    {
      content_hash: 'abc',
      created_at: '2026-08-06T00:00:00.000Z',
      data: { content: '## Coordinated credential theft' },
      version: 1,
    },
  ],
};

describe('listAgentBuilderAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scopedSelfGetMock.mockResolvedValue({
      body: { results: [ATTACHMENT], total_token_estimate: 12 },
      status: 200,
    });
  });

  it('lists the attachments of the conversation, at the public API version', async () => {
    await listAgentBuilderAttachments(params);

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/agent_builder/conversations/c-1/attachments',
        request,
        spaceId: 'agent-1',
        version: '2023-10-31',
      })
    );
  });

  it('never asks for soft-deleted attachments', async () => {
    await listAgentBuilderAttachments(params);

    expect(scopedSelfGetMock.mock.calls[0][0]).not.toHaveProperty('query');
  });

  it("returns Agent Builder's own results, in its own order", async () => {
    expect((await listAgentBuilderAttachments(params)).attachments).toEqual([ATTACHMENT]);
  });

  it('reports a readable conversation as existing', async () => {
    expect((await listAgentBuilderAttachments(params)).exists).toBe(true);
  });

  it('reports a 404 as not existing', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 404 });

    expect(await listAgentBuilderAttachments(params)).toEqual({
      attachments: undefined,
      exists: false,
      status: 404,
    });
  });

  it('reports a 403 as not existing, keeping existence non-observable', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 403 });

    expect(await listAgentBuilderAttachments(params)).toEqual({
      attachments: undefined,
      exists: false,
      status: 403,
    });
  });

  // The self-client fetch is unvalidated, so a body that is not the documented shape is reachable
  // at runtime even though it is not reachable at compile time.
  it('treats a body with no results array as no attachments, rather than throwing', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: { total_token_estimate: 0 }, status: 200 });

    expect(await listAgentBuilderAttachments(params)).toEqual({
      attachments: undefined,
      exists: true,
      status: 200,
    });
  });

  it('propagates a transport error so the caller can map it to a 500', async () => {
    scopedSelfGetMock.mockRejectedValue(new Error('boom'));

    await expect(listAgentBuilderAttachments(params)).rejects.toThrow('boom');
  });
});
