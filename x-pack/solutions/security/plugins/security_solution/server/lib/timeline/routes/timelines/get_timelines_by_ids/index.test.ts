/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../../detection_engine/routes/__mocks__';
import { getAllTimelineByIds } from '../../../saved_object/timelines';
import { getTimelinesByIdsRoute, MAX_IDS_PER_REQUEST } from '.';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../../detection_engine/routes/__mocks__/request_context';
import { INTERNAL_TIMELINES_BY_IDS_URL } from '../../../../../../common/constants';

const postRequest = (body: Record<string, unknown>) =>
  requestMock.create({
    method: 'post',
    path: INTERNAL_TIMELINES_BY_IDS_URL,
    body,
  });

jest.mock('../../../saved_object/timelines', () => ({
  getAllTimelineByIds: jest.fn(),
}));

describe('POST /internal/timelines/_by_ids', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    context = requestContextMock.createTools().context;
    getTimelinesByIdsRoute(server.router);
  });

  test('forwards ids and the optional filter/sort/page params to the saved-object helper', async () => {
    (getAllTimelineByIds as jest.Mock).mockResolvedValue({ totalCount: 0, timeline: [] });

    const result = await server.inject(
      postRequest({
        ids: ['id-1', 'id-2'],
        pageSize: 5,
        pageIndex: 2,
        search: 'phish',
        sortField: 'updated',
        sortOrder: 'desc',
        status: 'active',
        timelineType: 'default',
        onlyUserFavorite: true,
      }),
      requestContextMock.convertContext(context)
    );

    expect(result.status).toBe(200);
    expect(getAllTimelineByIds as jest.Mock).toHaveBeenCalledTimes(1);
    const [, ids, options] = (getAllTimelineByIds as jest.Mock).mock.calls[0];
    expect(ids).toEqual(['id-1', 'id-2']);
    expect(options).toEqual({
      onlyUserFavorite: true,
      pageInfo: { pageSize: 5, pageIndex: 2 },
      search: 'phish',
      sort: { sortField: 'updated', sortOrder: 'desc' },
      status: 'active',
      timelineType: 'default',
    });
  });

  test('defaults paging to the requested ids length and pageIndex 1 when omitted', async () => {
    (getAllTimelineByIds as jest.Mock).mockResolvedValue({ totalCount: 0, timeline: [] });

    await server.inject(
      postRequest({ ids: ['id-1', 'id-2', 'id-3'] }),
      requestContextMock.convertContext(context)
    );

    const [, , options] = (getAllTimelineByIds as jest.Mock).mock.calls[0];
    expect(options.pageInfo).toEqual({ pageSize: 3, pageIndex: 1 });
    expect(options.onlyUserFavorite).toBeNull();
    expect(options.status).toBeNull();
    expect(options.timelineType).toBeNull();
    expect(options.sort).toBeNull();
    expect(options.search).toBeNull();
  });

  test('rejects requests with an empty ids array (zod min(1))', async () => {
    // serverMock.inject() rethrows on validation rejection; assert via the thrown message.
    await expect(
      server.inject(postRequest({ ids: [] }), requestContextMock.convertContext(context))
    ).rejects.toThrow(/Request was rejected/);
    expect(getAllTimelineByIds).not.toHaveBeenCalled();
  });

  test(`rejects requests with more than ${MAX_IDS_PER_REQUEST} ids (zod max)`, async () => {
    const tooMany = Array.from({ length: MAX_IDS_PER_REQUEST + 1 }, (_, i) => `id-${i}`);
    await expect(
      server.inject(postRequest({ ids: tooMany }), requestContextMock.convertContext(context))
    ).rejects.toThrow(/Request was rejected/);
    expect(getAllTimelineByIds).not.toHaveBeenCalled();
  });
});
