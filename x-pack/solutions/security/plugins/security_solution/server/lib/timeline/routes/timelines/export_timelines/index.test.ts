/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockTimelines,
  mockNotes,
  mockTimelinesSavedObjects,
  mockPinnedEvents,
  getExportTimelinesRequest,
} from '../../../__mocks__/request_responses';
import { exportTimelinesRoute } from '.';
import {
  serverMock,
  requestContextMock,
  requestMock,
  createMockConfig,
} from '../../../../detection_engine/routes/__mocks__';
import { TIMELINE_EXPORT_URL } from '../../../../../../common/constants';
import { convertSavedObjectToSavedNote } from '../../../saved_object/notes/saved_object';
import { convertSavedObjectToSavedPinnedEvent } from '../../../saved_object/pinned_events';
import { convertSavedObjectToSavedTimeline } from '../../../saved_object/timelines/convert_saved_object_to_savedtimeline';
import type {
  MockClients,
  SecuritySolutionRequestHandlerContextMock,
} from '../../../../detection_engine/routes/__mocks__/request_context';

jest.mock('../../../saved_object/timelines/convert_saved_object_to_savedtimeline', () => {
  return {
    convertSavedObjectToSavedTimeline: jest.fn(),
  };
});

jest.mock('../../../saved_object/notes/saved_object', () => {
  return {
    convertSavedObjectToSavedNote: jest.fn(),
    getNotesByTimelineId: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../saved_object/pinned_events', () => {
  return {
    convertSavedObjectToSavedPinnedEvent: jest.fn(),
    getAllPinnedEventsByTimelineId: jest.fn().mockReturnValue([]),
  };
});
describe('export timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let clients: MockClients;
  let context: SecuritySolutionRequestHandlerContextMock;

  const registerRoute = (overrides?: Partial<ReturnType<typeof createMockConfig>>) => {
    const routeConfig = { ...createMockConfig(), ...overrides };
    exportTimelinesRoute(server.router, routeConfig);
    return routeConfig;
  };

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    clients.savedObjectsClient.bulkGet.mockResolvedValue(mockTimelinesSavedObjects());

    (convertSavedObjectToSavedTimeline as unknown as jest.Mock).mockReturnValue(mockTimelines());
    (convertSavedObjectToSavedNote as unknown as jest.Mock).mockReturnValue(mockNotes());
    (convertSavedObjectToSavedPinnedEvent as unknown as jest.Mock).mockReturnValue(
      mockPinnedEvents()
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('status codes', () => {
    test('returns 200 when finding selected timelines', async () => {
      registerRoute();
      const response = await server.inject(
        getExportTimelinesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(200);
    });

    test('catch error when status search throws error', async () => {
      registerRoute();
      clients.savedObjectsClient.bulkGet.mockReset();
      clients.savedObjectsClient.bulkGet.mockRejectedValue(new Error('Test error'));
      const response = await server.inject(
        getExportTimelinesRequest(),
        requestContextMock.convertContext(context)
      );
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });

    test('returns 400 when requested ids exceed export size limit', async () => {
      const config = registerRoute({ maxTimelineImportExportSize: 1 });
      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: TIMELINE_EXPORT_URL,
          query: {
            file_name: 'mock_export_timeline.ndjson',
          },
          body: {
            ids: ['id-1', 'id-2'],
          },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(400);
      expect(response.body).toEqual({
        message: `Can't export more than ${config.maxTimelineImportExportSize} timelines`,
        status_code: 400,
      });
    });

    test('deduplicates ids before applying export size limit', async () => {
      registerRoute({ maxTimelineImportExportSize: 1 });
      const response = await server.inject(
        requestMock.create({
          method: 'post',
          path: TIMELINE_EXPORT_URL,
          query: {
            file_name: 'mock_export_timeline.ndjson',
          },
          body: {
            ids: ['f0e58720-57b6-11ea-b88d-3f1a31716be8', 'f0e58720-57b6-11ea-b88d-3f1a31716be8'],
          },
        }),
        requestContextMock.convertContext(context)
      );

      expect(response.status).toEqual(200);
      expect(clients.savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { id: 'f0e58720-57b6-11ea-b88d-3f1a31716be8', type: 'siem-ui-timeline' },
      ]);
    });
  });

  describe('request validation', () => {
    test('return validation error for request body', async () => {
      registerRoute();
      const request = requestMock.create({
        method: 'get',
        path: TIMELINE_EXPORT_URL,
        body: { id: 'someId' },
      });
      const result = server.validate(request);

      expect(result.badRequest.mock.calls[0][0]).toEqual(
        'file_name: Invalid input: expected string, received undefined'
      );
    });

    test('return validation error for request params', async () => {
      registerRoute();
      const request = requestMock.create({
        method: 'get',
        path: TIMELINE_EXPORT_URL,
        query: { file_name: 'test.ndjson' },
        body: { ids: 'someId' },
      });
      const result = server.validate(request);

      expect(result.badRequest.mock.calls[0][0]).toEqual(
        'ids: Invalid input: expected array, received string'
      );
    });
  });
});
