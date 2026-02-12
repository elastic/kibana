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
import type { SecuritySolutionRequestHandlerContextMock } from '../../../detection_engine/routes/__mocks__/request_context';
import { AssociatedFilter } from '../../../../../common/notes/constants';

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
  let context: SecuritySolutionRequestHandlerContextMock;
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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

  test('should only return notes attached to both timeline and alert', async () => {
    const timelineId = 'b831446a-d446-4582-aa82-5cd0329311f7';
    const mockNotesFromDb = [
      {
        // Note attached to both timeline AND alert - should be INCLUDED
        id: uuidv4(),
        timelineId,
        eventId: 'e5435a7dce314692909b2742dc4431b5494043e697bcc4c96ff4e9eb89581de0',
        note: 'note attached to timeline and alert',
        created: 1767795503452,
        createdBy: 'elastic',
        updated: 1767795503452,
        updatedBy: 'elastic',
      },
      {
        // Investigation guide - has timeline but NO eventId field - should be EXCLUDED
        id: uuidv4(),
        timelineId,
        // eventId is undefined (field missing)
        note: 'investigation guide without eventId',
        created: 1767624890170,
        createdBy: 'elastic',
        updated: 1767624890170,
        updatedBy: 'elastic',
      },
      {
        // Note with empty eventId - should be EXCLUDED
        id: uuidv4(),
        timelineId,
        eventId: '',
        note: 'note with empty eventId',
        created: 1767795454234,
        createdBy: 'elastic',
        updated: 1767795454234,
        updatedBy: 'elastic',
      },
    ];

    mockGetAllSavedNote.mockResolvedValue({
      notes: mockNotesFromDb,
      totalCount: mockNotesFromDb.length,
    });

    const response = await server.inject(
      getAllNotesRequest({
        associatedFilter: AssociatedFilter.documentAndSavedObject,
      }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);

    expect(response.body.notes).toHaveLength(1);
    expect(response.body.notes[0].note).toEqual('note attached to timeline and alert');
    expect(response.body.totalCount).toEqual(1);
  });

  test('should only return notes with valid eventId and no timeline', async () => {
    const mockNotesFromDb = [
      {
        // Note attached to alert only - should be INCLUDED
        id: uuidv4(),
        timelineId: '',
        eventId: 'alert-id-123',
        note: 'note attached to alert only',
        created: 1767624879923,
        createdBy: 'elastic',
        updated: 1767624879923,
        updatedBy: 'elastic',
      },
      {
        // Orphan note with no eventId - should be EXCLUDED
        id: uuidv4(),
        timelineId: '',
        // eventId is undefined
        note: 'orphan note without eventId',
        created: 1767624890170,
        createdBy: 'elastic',
        updated: 1767624890170,
        updatedBy: 'elastic',
      },
    ];

    mockGetAllSavedNote.mockResolvedValue({
      notes: mockNotesFromDb,
      totalCount: mockNotesFromDb.length,
    });

    const response = await server.inject(
      getAllNotesRequest({ associatedFilter: AssociatedFilter.documentOnly }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);

    expect(response.body.notes).toHaveLength(1);
    expect(response.body.notes[0].note).toEqual('note attached to alert only');
    expect(response.body.totalCount).toEqual(1);
  });

  test('should return timeline-only notes when eventId is empty or missing', async () => {
    const timelineId = '94d67688-1a81-41e7-a9cc-feff2a320b8f';
    const mockNotesFromDb = [
      {
        // Timeline note with empty eventId - should be INCLUDED
        id: uuidv4(),
        timelineId,
        eventId: '',
        note: 'note on timeline',
        created: 1770829616878,
        createdBy: 'elastic',
        updated: 1770829616878,
        updatedBy: 'elastic',
      },
      {
        // Investigation guide-like note without eventId - should be INCLUDED
        id: uuidv4(),
        timelineId,
        note: 'investigation guide without eventId',
        created: 1770829580900,
        createdBy: 'elastic',
        updated: 1770829580900,
        updatedBy: 'elastic',
      },
      {
        // Note attached to both timeline and alert - should be EXCLUDED
        id: uuidv4(),
        timelineId,
        eventId: '71a66a11cdc337f01005859081ebad8d5bf093e7396b44b8eae7882d4744910b',
        note: 'note attached to timeline and alert',
        created: 1770829574213,
        createdBy: 'elastic',
        updated: 1770829574213,
        updatedBy: 'elastic',
      },
    ];

    mockGetAllSavedNote.mockResolvedValue({
      notes: mockNotesFromDb,
      totalCount: mockNotesFromDb.length,
    });

    const response = await server.inject(
      getAllNotesRequest({ associatedFilter: AssociatedFilter.savedObjectOnly }),
      requestContextMock.convertContext(context)
    );

    expect(response.status).toEqual(200);
    expect(response.body.notes).toHaveLength(2);
    expect(response.body.notes.map((note: { note: string }) => note.note).sort()).toEqual(
      ['note on timeline', 'investigation guide without eventId'].sort()
    );
    expect(response.body.totalCount).toEqual(2);
  });
});
