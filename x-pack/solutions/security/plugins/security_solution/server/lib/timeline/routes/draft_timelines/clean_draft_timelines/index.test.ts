/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { TimelineTypeEnum } from '../../../../../../common/api/timeline';

import {
  serverMock,
  requestContextMock,
  createMockConfig,
} from '../../../../detection_engine/routes/__mocks__';

import { mockGetCurrentUser, mockGetDraftTimelineValue } from '../../../__mocks__/import_timelines';
import {
  cleanDraftTimelinesRequest,
  createTimelineWithTimelineId,
} from '../../../__mocks__/request_responses';
import { draftTimelineDefaults } from '../../../utils/default_timeline';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../../detection_engine/routes/__mocks__/request_context';

describe('clean draft timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let context: SecuritySolutionRequestHandlerContextMock;
  let mockGetTimeline: Mock;
  let mockGetDraftTimeline: Mock;
  let mockPersistTimeline: Mock;
  let mockPersistPinnedEventOnTimeline: Mock;
  let mockPersistNote: Mock;
  let mockResetTimeline: Mock;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = {
      authc: {
        getCurrentUser: vi.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    mockGetTimeline = vi.fn();
    mockGetDraftTimeline = vi.fn();
    mockPersistTimeline = vi.fn();
    mockPersistPinnedEventOnTimeline = vi.fn();
    mockPersistNote = vi.fn();
    mockResetTimeline = vi.fn();

    vi.doMock('../../../saved_object/timelines', () => {
          const mocked = {
              getTimeline: mockGetTimeline,
              getDraftTimeline: mockGetDraftTimeline,
              resetTimeline: mockResetTimeline,
              persistTimeline: mockPersistTimeline.mockReturnValue({
                code: 200,
                timeline: createTimelineWithTimelineId,
              }),
            };
          return { ...mocked, default: mocked };
        });

    vi.doMock('../../../saved_object/pinned_events', () => {
          const mocked = {
              persistPinnedEventOnTimeline: mockPersistPinnedEventOnTimeline,
            };
          return { ...mocked, default: mocked };
        });

    vi.doMock('../../../saved_object/notes', () => {
          const mocked = {
              persistNote: mockPersistNote,
            };
          return { ...mocked, default: mocked };
        });

    const cleanDraftTimelinesRoute = (await vi.importActual('.')).cleanDraftTimelinesRoute;
    cleanDraftTimelinesRoute(server.router, createMockConfig(), securitySetup);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test('should create new draft if none is available', async () => {
    mockGetDraftTimeline.mockResolvedValue({
      timeline: [],
    });

    const response = await server.inject(
      cleanDraftTimelinesRequest(TimelineTypeEnum.default),
      requestContextMock.convertContext(context)
    );
    const req = cleanDraftTimelinesRequest(TimelineTypeEnum.default);
    expect(mockPersistTimeline).toHaveBeenCalled();
    expect(mockPersistTimeline.mock.calls[0][3]).toEqual({
      ...draftTimelineDefaults,
      timelineType: req.body.timelineType,
    });
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(createTimelineWithTimelineId);
  });

  test('should return clean existing draft if draft available ', async () => {
    mockGetDraftTimeline.mockResolvedValue({
      timeline: [mockGetDraftTimelineValue],
    });
    mockResetTimeline.mockResolvedValue({});
    mockGetTimeline.mockResolvedValue({ ...mockGetDraftTimelineValue });

    const response = await server.inject(
      cleanDraftTimelinesRequest(TimelineTypeEnum.default),
      requestContextMock.convertContext(context)
    );
    const req = cleanDraftTimelinesRequest(TimelineTypeEnum.default);

    expect(mockPersistTimeline).not.toHaveBeenCalled();
    expect(mockResetTimeline).toHaveBeenCalled();
    expect(mockResetTimeline.mock.calls[0][1]).toEqual(mockGetDraftTimelineValue.savedObjectId);
    expect(mockResetTimeline.mock.calls[0][2]).toEqual(req.body.timelineType);

    expect(mockGetTimeline).toHaveBeenCalled();
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockGetDraftTimelineValue);
  });
});
