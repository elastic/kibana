/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type SuperTest from 'supertest';
import {
  GetNotesResult,
  Note,
  PersistNoteRouteRequestBody,
} from '@kbn/security-solution-plugin/common/api/timeline';
import { NOTE_URL } from '@kbn/security-solution-plugin/common/constants';

/**
 * Deletes the first 100 notes (the getNotes endpoints is paginated and defaults to 10 is nothing is provided)
 * This works in ess, serverless and on the MKI environments as it avoids having to look at hidden indexes.
 */
export const deleteNotes = async (supertest: SuperTest.Agent): Promise<void> => {
  const response = await supertest
    .get(`${NOTE_URL}?perPage=100`)
    .set('kbn-xsrf', 'true')
    .set('elastic-api-version', '2023-10-31');
  const { notes } = response.body as GetNotesResult;

  await supertest
    .delete(NOTE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      noteIds: notes.map((note: Note) => note.noteId),
    });
};

/**
 * Create a note that can be attached to a document only, a saved object only, both or none
 *
 * @param supertest
 * @param note
 *   documentId is the document (alert, event...) id we want to associate the note with
 *   savedObjectId is the id of the saved object (most likely a timeline id) we want to associate the note with
 */
export const createNote = async (
  supertest: SuperTest.Agent,
  note: {
    documentId?: string;
    savedObjectId?: string;
    text: string;
  }
) =>
  await supertest
    .patch(NOTE_URL)
    .set('kbn-xsrf', 'true')
    .send({
      note: {
        eventId: note.documentId || '',
        timelineId: note.savedObjectId || '',
        note: note.text,
      },
    } as PersistNoteRouteRequestBody);
