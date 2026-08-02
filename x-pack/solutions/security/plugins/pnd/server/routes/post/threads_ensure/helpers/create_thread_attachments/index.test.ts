/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import { scopedSelfPost } from '../../../../helpers/scoped_self_post';
import type { PndThreadAttachmentInput } from '../build_thread_attachments';
import { createThreadAttachments } from '.';

jest.mock('../../../../helpers/scoped_self_post');

const scopedSelfPostMock = scopedSelfPost as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;
const logger = loggerMock.create();

const attachment = (id: string): PndThreadAttachmentInput => ({
  data: { content: `content for ${id}` },
  description: id,
  id,
  type: 'text',
});

const params = {
  attachments: [attachment('a'), attachment('b'), attachment('c')],
  conversationId: 'c-1',
  http,
  logger,
  request,
  spaceId: 'agent-1',
};

describe('createThreadAttachments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scopedSelfPostMock.mockResolvedValue({ body: undefined, status: 200 });
  });

  it('posts every attachment to the conversation attachments route', async () => {
    await createThreadAttachments(params);

    expect(scopedSelfPostMock).toHaveBeenCalledTimes(3);
    expect(scopedSelfPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/agent_builder/conversations/c-1/attachments',
        version: '2023-10-31',
      })
    );
  });

  it('sends the deterministic id, type and text content', async () => {
    await createThreadAttachments(params);

    expect(scopedSelfPostMock.mock.calls[0][0].body).toEqual({
      data: { content: 'content for a' },
      description: 'a',
      id: 'a',
      type: 'text',
    });
  });

  it('reports every attachment as present when all creates succeed', async () => {
    expect(await createThreadAttachments(params)).toEqual({
      missing: [],
      present: ['a', 'b', 'c'],
    });
  });

  it('treats a 409 as already present, so a retry cannot grow the set', async () => {
    scopedSelfPostMock.mockResolvedValue({ body: undefined, status: 409 });

    expect(await createThreadAttachments(params)).toEqual({
      missing: [],
      present: ['a', 'b', 'c'],
    });
  });

  it('does not log a 409 as a failure', async () => {
    scopedSelfPostMock.mockResolvedValue({ body: undefined, status: 409 });

    await createThreadAttachments(params);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reports a failed attachment as missing without failing the rest', async () => {
    scopedSelfPostMock
      .mockResolvedValueOnce({ body: undefined, status: 200 })
      .mockResolvedValueOnce({ body: undefined, status: 500 })
      .mockResolvedValueOnce({ body: undefined, status: 200 });

    expect(await createThreadAttachments(params)).toEqual({
      missing: ['b'],
      present: ['a', 'c'],
    });
  });

  it('names the thread, the space and the attachment when one fails', async () => {
    scopedSelfPostMock
      .mockResolvedValueOnce({ body: undefined, status: 200 })
      .mockResolvedValueOnce({ body: undefined, status: 500 })
      .mockResolvedValueOnce({ body: undefined, status: 200 });

    await createThreadAttachments(params);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"b"'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"c-1"'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"agent-1"'));
  });

  it('swallows a transport error, reports it as missing, and logs the message not the object', async () => {
    scopedSelfPostMock
      .mockResolvedValueOnce({ body: undefined, status: 200 })
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce({ body: undefined, status: 200 });

    expect(await createThreadAttachments(params)).toEqual({
      missing: ['b'],
      present: ['a', 'c'],
    });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('socket hang up'));
  });

  it('creates serially, because every create rewrites the whole conversation document', async () => {
    const order: string[] = [];
    scopedSelfPostMock.mockImplementation(async ({ body }: { body: { id: string } }) => {
      order.push(`start:${body.id}`);
      await Promise.resolve();
      order.push(`end:${body.id}`);
      return { body: undefined, status: 200 };
    });

    await createThreadAttachments(params);

    expect(order).toEqual(['start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c']);
  });
});
