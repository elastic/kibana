/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../saved_object/notes', () => ({
  persistNote: jest.fn(),
}));
jest.mock('../../utils/common', () => ({
  buildFrameworkRequest: jest.fn().mockResolvedValue({}),
}));

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { NOTE_URL } from '../../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../../detection_engine/routes/__mocks__';
import type { SecuritySolutionRequestHandlerContextMock } from '../../../detection_engine/routes/__mocks__/request_context';
import { persistNote } from '../../saved_object/notes';
import { persistNoteRoute } from './persist_note';
import type { SecuritySolutionEventBus } from '../../../../events/event_bus';

const noteBody = {
  note: {
    eventId: 'event-1',
    note: 'test note content',
    timelineId: 'timeline-1',
  },
};

const makePersistNoteResponse = (noteId: string, updatedBy?: string) => ({
  note: {
    noteId,
    createdBy: 'test-user',
    updatedBy: updatedBy ?? 'test-user',
    note: 'test note content',
    timelineId: 'timeline-1',
    eventId: 'event-1',
  },
});

describe('persistNoteRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let context: SecuritySolutionRequestHandlerContextMock;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ context } = requestContextMock.createTools());
    mockLogger = loggingSystemMock.createLogger();
    (persistNote as jest.Mock).mockResolvedValue(makePersistNoteResponse('created-note-id'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('workflow trigger emission', () => {
    let mockEventBus: { emitNoteCreated: jest.Mock; emitNoteUpdated: jest.Mock };

    beforeEach(() => {
      server = serverMock.create();
      mockEventBus = { emitNoteCreated: jest.fn(), emitNoteUpdated: jest.fn() };
      persistNoteRoute(
        server.router,
        mockLogger,
        mockEventBus as unknown as SecuritySolutionEventBus
      );
    });

    test('emits noteCreated when creating a note linked to an event', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: noteBody,
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteCreated).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          noteId: 'created-note-id',
          documentId: 'event-1',
        })
      );
      expect(mockEventBus.emitNoteUpdated).not.toHaveBeenCalled();
    });

    test('emits noteUpdated when updating a note linked to an event', async () => {
      (persistNote as jest.Mock).mockResolvedValue(makePersistNoteResponse('existing-note-id'));
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: { ...noteBody, noteId: 'existing-note-id' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteUpdated).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          noteId: 'existing-note-id',
          documentId: 'event-1',
        })
      );
      expect(mockEventBus.emitNoteCreated).not.toHaveBeenCalled();
    });

    test('emits noteUpdated using persisted eventId when update request omits eventId', async () => {
      // Simulates a text-only patch: the client sends noteId + note text but no eventId.
      // The route must fall back to res.note.eventId so the trigger still fires.
      (persistNote as jest.Mock).mockResolvedValue(makePersistNoteResponse('existing-note-id'));
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: {
          noteId: 'existing-note-id',
          note: { note: 'updated text', timelineId: 'timeline-1' }, // no eventId
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteUpdated).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          noteId: 'existing-note-id',
          documentId: 'event-1', // from res.note.eventId, not the request body
        })
      );
      expect(mockEventBus.emitNoteCreated).not.toHaveBeenCalled();
    });

    test('skips emit and logs warn when noteId is missing after persist', async () => {
      (persistNote as jest.Mock).mockResolvedValue({ note: { createdBy: 'test-user' } });
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: noteBody,
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteCreated).not.toHaveBeenCalled();
      expect(mockEventBus.emitNoteUpdated).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipping workflow trigger: noteId missing after note persist'
      );
    });

    test('skips noteCreated and logs warn when createdBy is missing after persist', async () => {
      (persistNote as jest.Mock).mockResolvedValue({ note: { noteId: 'created-note-id' } });
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: noteBody,
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteCreated).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipping noteCreated trigger: createdBy missing (noteId: created-note-id)'
      );
    });

    test('skips noteUpdated and logs warn when updatedBy and createdBy are both missing', async () => {
      (persistNote as jest.Mock).mockResolvedValue({ note: { noteId: 'existing-note-id' } });
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: { ...noteBody, noteId: 'existing-note-id' },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteUpdated).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipping noteUpdated trigger: updatedBy missing (noteId: existing-note-id)'
      );
    });

    test('does not emit when the note has no eventId', async () => {
      const request = requestMock.create({
        method: 'patch',
        path: NOTE_URL,
        body: {
          note: {
            note: 'test note content',
            timelineId: 'timeline-1',
          },
        },
      });
      await server.inject(request, requestContextMock.convertContext(context));
      await new Promise((r) => setTimeout(r, 0));
      expect(mockEventBus.emitNoteCreated).not.toHaveBeenCalled();
      expect(mockEventBus.emitNoteUpdated).not.toHaveBeenCalled();
    });
  });
});
