/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import {
  serverMock,
  requestContextMock,
  createMockConfig,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import { NOTE_URL } from '../../../../../common/constants';
import type { GetNotesRequestQuery } from '../../../../../common/api/timeline';
import { mockGetCurrentUser } from '../../__mocks__/import_timelines';

const getAllNotesRequest = (query?: GetNotesRequestQuery) =>
  requestMock.create({
    method: 'get',
    path: NOTE_URL,
    query,
  });

const createMockedNotes = (
  numberOfNotes: number,
  options?: { documentId?: string; savedObjectId?: string }
) =>
  Array.from({ length: numberOfNotes }, () => ({
    id: uuidv4(),
    timelineId: options?.savedObjectId || 'timeline',
    eventId: options?.documentId || 'event',
    note: `test note`,
    created: 1280120812453,
    createdBy: 'test',
    updated: 108712801280,
    updatedBy: 'test',
  }));

describe('get notes route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  let { context } = requestContextMock.createTools();
  let mockGetAllSavedNote: jest.Mock;

  beforeEach(() => {
    jest.resetModules();

    server = serverMock.create();
    context = requestContextMock.createTools().context;

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    mockGetAllSavedNote = jest.fn();
    jest.doMock('../../saved_object/notes', () => ({
      getAllSavedNote: mockGetAllSavedNote,
    }));

    const getNotesRoute = jest.requireActual('.').getNotesRoute;
    getNotesRoute(server.router, createMockConfig(), securitySetup);
  });

  test('should return a list of notes and the count by default', async () => {
    const mockNotes = createMockedNotes(3);
    mockGetAllSavedNote.mockResolvedValue({
      notes: mockNotes,
      totalCount: mockNotes.length,
    });

    const response = await server.inject(
      getAllNotesRequest(),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      notes: mockNotes,
      totalCount: mockNotes.length,
    });
  });

  test('should return a list of notes filtered by an array of document ids', async () => {
    const documentId = 'document1';
    const mockDocumentNotes = createMockedNotes(3, { documentId });
    mockGetAllSavedNote.mockResolvedValue({
      notes: mockDocumentNotes,
      totalCount: mockDocumentNotes.length,
    });

    const response = await server.inject(
      getAllNotesRequest({ documentIds: [documentId] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      notes: mockDocumentNotes,
      totalCount: mockDocumentNotes.length,
    });
  });

  test('should return a list of notes filtered by a single document id', async () => {
    const documentId = 'document2';
    const mockDocumentNotes = createMockedNotes(3, { documentId });
    mockGetAllSavedNote.mockResolvedValue({
      notes: mockDocumentNotes,
      totalCount: mockDocumentNotes.length,
    });

    const response = await server.inject(
      getAllNotesRequest({ documentIds: documentId }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      notes: mockDocumentNotes,
      totalCount: mockDocumentNotes.length,
    });
  });

  test('should return a list of notes filtered by an array of saved object ids', async () => {
    const savedObjectId = 'savedObject1';
    const mockSavedObjectIdNotes = createMockedNotes(3, { savedObjectId });
    mockGetAllSavedNote.mockResolvedValue({
      notes: mockSavedObjectIdNotes,
      totalCount: mockSavedObjectIdNotes.length,
    });

    const response = await server.inject(
      getAllNotesRequest({ savedObjectIds: [savedObjectId] }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      notes: mockSavedObjectIdNotes,
      totalCount: mockSavedObjectIdNotes.length,
    });
  });

  test('should return a list of notes filtered by a single saved object id', async () => {
    const savedObjectId = 'savedObject2';
    const mockSavedObjectIdNotes = createMockedNotes(3, { savedObjectId });
    mockGetAllSavedNote.mockResolvedValue({
      notes: mockSavedObjectIdNotes,
      totalCount: mockSavedObjectIdNotes.length,
    });

    const response = await server.inject(
      getAllNotesRequest({ savedObjectIds: savedObjectId }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      notes: mockSavedObjectIdNotes,
      totalCount: mockSavedObjectIdNotes.length,
    });
  });
});
