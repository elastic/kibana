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
  getDraftTimelinesRequest,
  createTimelineWithTimelineId,
} from '../../../__mocks__/request_responses';
import { draftTimelineDefaults } from '../../../utils/default_timeline';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../../detection_engine/routes/__mocks__/request_context';

describe('get draft timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let context: SecuritySolutionRequestHandlerContextMock;
  let mockGetTimeline: Mock;
  let mockGetDraftTimeline: Mock;
  let mockPersistTimeline: Mock;
  let mockPersistPinnedEventOnTimeline: Mock;
  let mockPersistNote: Mock;

  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('Manipulate timeline', () => {
    describe('Create a new timeline', () => {
      beforeEach(async () => {
        vi.doMock('../../../saved_object/timelines', () => {
              const mocked = {
                      getTimeline: mockGetTimeline,
                      getDraftTimeline: mockGetDraftTimeline,
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

        const getDraftTimelinesRoute = (await vi.importActual('.')).getDraftTimelinesRoute;
        getDraftTimelinesRoute(server.router, createMockConfig(), securitySetup);
      });

      test('should create new draft if none is available', async () => {
        mockGetDraftTimeline.mockResolvedValue({
          timeline: [],
        });
        const req = getDraftTimelinesRequest(TimelineTypeEnum.default);
        const response = await server.inject(req, requestContextMock.convertContext(context));
        expect(mockPersistTimeline).toHaveBeenCalled();
        expect(mockPersistTimeline.mock.calls[0][3]).toEqual({
          ...draftTimelineDefaults,
          timelineType: req.query.timelineType,
        });

        expect(response.status).toEqual(200);
        expect(response.body).toEqual(createTimelineWithTimelineId);
      });

      test('should return an existing draft if available', async () => {
        mockGetDraftTimeline.mockResolvedValue({
          timeline: [mockGetDraftTimelineValue],
        });

        const response = await server.inject(
          getDraftTimelinesRequest(TimelineTypeEnum.default),
          requestContextMock.convertContext(context)
        );
        expect(mockPersistTimeline).not.toHaveBeenCalled();
        expect(response.status).toEqual(200);
        expect(response.body).toEqual(mockGetDraftTimelineValue);
      });
    });
  });
});
