/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { GetNotesResult, Note } from '@kbn/security-solution-plugin/common/api/timeline';
import { NOTE_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';
import { createNote, deleteNotes } from '../../utils/notes';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  let supertest: TestAgent;

  describe('Note - Saved Objects', () => {
    before(async () => {
      supertest = await utils.createSuperTest();
    });

    describe('create a note', () => {
      it('should return a timelineId, noteId and version', async () => {
        const myNote = 'world test';
        const response = await supertest
          .patch(NOTE_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: 'testTimelineId' },
          });

        const { note, noteId, timelineId, version } =
          response.body.data && response.body.data.persistNote.note;

        expect(note).to.be(myNote);
        expect(noteId).to.not.be.empty();
        expect(timelineId).to.not.be.empty();
        expect(version).to.not.be.empty();
      });

      it('should update note and return existing noteId and new version if noteId exist', async () => {
        const myNote = 'world test';
        const response = await supertest
          .patch(NOTE_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: 'testTimelineId' },
          });

        const { noteId, timelineId, version } =
          response.body.data && response.body.data.persistNote.note;

        const myNewNote = 'new world test';
        const responseToTest = await supertest
          .patch(NOTE_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            noteId,
            version,
            note: { note: myNewNote, timelineId },
          });

        expect(responseToTest.body.data!.persistNote.note.note).to.be(myNewNote);
        expect(responseToTest.body.data!.persistNote.note.noteId).to.be(noteId);
        expect(responseToTest.body.data!.persistNote.note.version).to.not.be.eql(version);
      });
    });

    describe('get notes', () => {
      beforeEach(async () => {
        await deleteNotes(supertest);
      });

      const eventId1 = uuidv4();
      const eventId2 = uuidv4();
      const eventId3 = uuidv4();
      const timelineId1 = uuidv4();
      const timelineId2 = uuidv4();
      const timelineId3 = uuidv4();

      it('should retrieve all the notes for a document id', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, { documentId: eventId2, text: 'associated with event-2 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            savedObjectId: timelineId2,
            text: 'associated with timeline-2 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, {
            documentId: eventId2,
            savedObjectId: timelineId2,
            text: 'associated with event-2 and timeline-2',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
          createNote(supertest, {
            text: `associated with nothing but has ${eventId1} in the text`,
          }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?documentIds=${eventId1}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(2);
        notes.forEach((note: Note) => expect(note.eventId).to.be(eventId1));
      });

      it('should retrieve all the notes for multiple document ids', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, { documentId: eventId2, text: 'associated with event-2 only' }),
          createNote(supertest, { documentId: eventId3, text: 'associated with event-3 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            savedObjectId: timelineId2,
            text: 'associated with timeline-2 only',
          }),
          createNote(supertest, {
            savedObjectId: timelineId3,
            text: 'associated with timeline-3 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, {
            documentId: eventId2,
            savedObjectId: timelineId2,
            text: 'associated with event-2 and timeline-2',
          }),
          createNote(supertest, {
            documentId: eventId3,
            savedObjectId: timelineId3,
            text: 'associated with event-3 and timeline-3',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
          createNote(supertest, {
            text: `associated with nothing but has ${eventId1} in the text`,
          }),
          createNote(supertest, {
            text: `associated with nothing but has ${eventId2} in the text`,
          }),
          createNote(supertest, {
            text: `associated with nothing but has ${eventId3} in the text`,
          }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?documentIds=${eventId1}&documentIds=${eventId2}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(4);
        notes.forEach((note: Note) => {
          expect(note.eventId).to.not.be(eventId3);
          expect(note.eventId).to.not.be('');
        });
      });

      it('should retrieve all the notes for a saved object id', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, { documentId: eventId2, text: 'associated with event-2 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            savedObjectId: timelineId2,
            text: 'associated with timeline-2 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, {
            documentId: eventId2,
            savedObjectId: timelineId2,
            text: 'associated with event-2 and timeline-2',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
          createNote(supertest, {
            text: `associated with nothing but has ${timelineId1} in the text`,
          }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?savedObjectIds=${timelineId1}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(2);
        notes.forEach((note: Note) => expect(note.timelineId).to.be(timelineId1));
      });

      it('should retrieve all the notes for multiple saved object ids', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, { documentId: eventId2, text: 'associated with event-2 only' }),
          createNote(supertest, { documentId: eventId3, text: 'associated with event-3 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            savedObjectId: timelineId2,
            text: 'associated with timeline-2 only',
          }),
          createNote(supertest, {
            savedObjectId: timelineId3,
            text: 'associated with timeline-3 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, {
            documentId: eventId2,
            savedObjectId: timelineId2,
            text: 'associated with event-2 and timeline-2',
          }),
          createNote(supertest, {
            documentId: eventId3,
            savedObjectId: timelineId3,
            text: 'associated with event-3 and timeline-3',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
          createNote(supertest, {
            text: `associated with nothing but has ${timelineId1} in the text`,
          }),
          createNote(supertest, {
            text: `associated with nothing but has ${timelineId2} in the text`,
          }),
          createNote(supertest, {
            text: `associated with nothing but has ${timelineId3} in the text`,
          }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?savedObjectIds=${timelineId1}&savedObjectIds=${timelineId2}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(4);
        notes.forEach((note: Note) => {
          expect(note.timelineId).to.not.be(timelineId3);
          expect(note.timelineId).to.not.be('');
        });
      });

      it('should retrieve all notes without any query params', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
        ]);

        const response = await supertest
          .get(NOTE_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(4);
      });

      it('should retrieve notes considering perPage  and page query parameters', async () => {
        await Promise.all([
          createNote(supertest, { text: 'first note' }),
          createNote(supertest, { text: 'second note' }),
          createNote(supertest, { text: 'third note' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?perPage=1`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(3);
        expect(notes.length).to.be(1);
      });

      it('should retrieve considering search query parameter', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?search=event`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(2);
      });

      // TODO why can't we sort on every field? (I tested for the note field (or a random field like abc) and the endpoint crashes)
      it('should retrieve considering sortField query parameters', async () => {
        await Promise.all([
          createNote(supertest, { documentId: '1', text: 'note 1' }),
          createNote(supertest, { documentId: '2', text: 'note 2' }),
          createNote(supertest, { documentId: '3', text: 'note 3' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?sortField=eventId`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(3);
        expect(notes[0].eventId).to.be('1');
        expect(notes[1].eventId).to.be('2');
        expect(notes[2].eventId).to.be('3');
      });

      it('should retrieve considering sortOrder query parameters', async () => {
        await Promise.all([
          createNote(supertest, { documentId: '1', text: 'note 1' }),
          createNote(supertest, { documentId: '2', text: 'note 2' }),
          createNote(supertest, { documentId: '3', text: 'note 3' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?sortField=eventId&sortOrder=desc`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(3);
        expect(notes[0].eventId).to.be('3');
        expect(notes[1].eventId).to.be('2');
        expect(notes[2].eventId).to.be('1');
      });

      // skipped https://github.com/elastic/kibana/issues/196896
      describe('@skipInServerless', () => {
        it('should retrieve all notes that have been created by a specific user', async () => {
          await Promise.all([
            createNote(supertest, { text: 'first note' }),
            createNote(supertest, { text: 'second note' }),
          ]);

          const response = await supertest
            .get(`${NOTE_URL}?userFilter=elastic`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31');
          const { totalCount } = response.body as GetNotesResult;

          expect(totalCount).to.be(2);
        });
      });

      it('should return nothing if no notes have been created by that user', async () => {
        await Promise.all([
          createNote(supertest, { text: 'first note' }),
          createNote(supertest, { text: 'second note' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?userFilter=user1`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(0);
      });

      it('should retrieve all notes that have an association with a document only', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?associatedFilter=document_only`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(1);
        expect(notes[0].eventId).to.be(eventId1);
      });

      it('should retrieve all notes that have an association with a saved object only', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?associatedFilter=saved_object_only`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(1);
        expect(notes[0].timelineId).to.be(timelineId1);
      });

      it('should retrieve all notes that have an association with a document AND a saved object', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?associatedFilter=document_and_saved_object`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(1);
        expect(notes[0].eventId).to.be(eventId1);
        expect(notes[0].timelineId).to.be(timelineId1);
      });

      it('should retrieve all notes that have an association with no document AND no saved object', async () => {
        await Promise.all([
          createNote(supertest, { documentId: eventId1, text: 'associated with event-1 only' }),
          createNote(supertest, {
            savedObjectId: timelineId1,
            text: 'associated with timeline-1 only',
          }),
          createNote(supertest, {
            documentId: eventId1,
            savedObjectId: timelineId1,
            text: 'associated with event-1 and timeline-1',
          }),
          createNote(supertest, { text: 'associated with nothing' }),
        ]);

        const response = await supertest
          .get(`${NOTE_URL}?associatedFilter=orphan`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');
        const { notes, totalCount } = response.body as GetNotesResult;

        expect(totalCount).to.be(1);
        expect(notes[0].eventId).to.be('');
        expect(notes[0].timelineId).to.be('');
      });

      // TODO should add more tests for the filter query parameter (I don't know how it's supposed to work)
      // TODO should add more tests for the MAX_UNASSOCIATED_NOTES advanced settings values
      // TODO add more tests to check the combination of filters (user, association and filter)
    });
  });
}
