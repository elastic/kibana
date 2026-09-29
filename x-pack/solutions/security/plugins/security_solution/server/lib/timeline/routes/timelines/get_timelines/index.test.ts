/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { serverMock, requestContextMock } from '../../../../detection_engine/routes/__mocks__';
import { getAllTimeline } from '../../../saved_object/timelines';
import { getTimelineRequest } from '../../../__mocks__/request_responses';
import { getTimelinesRoute } from '.';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../../detection_engine/routes/__mocks__/request_context';

vi.mock('../../../saved_object/timelines', () => {
      const mocked = {
      getAllTimeline: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('get all timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    getTimelinesRoute(server.router);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test('should get the total count', async () => {
    await server.inject(getTimelineRequest(), requestContextMock.convertContext(context));
    expect((getAllTimeline as Mock).mock.calls[0][2]).toEqual({ pageSize: 1, pageIndex: 1 });
  });

  test('should get all timelines with total count', async () => {
    (getAllTimeline as Mock).mockResolvedValue({ totalCount: 100 });
    await server.inject(getTimelineRequest(), requestContextMock.convertContext(context));
    expect((getAllTimeline as Mock).mock.calls[1][2]).toEqual({ pageSize: 100, pageIndex: 1 });
  });
});
