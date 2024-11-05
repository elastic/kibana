/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { Note } from '@kbn/security-solution-plugin/common/api/timeline';
import { createNote, deleteAllNotes } from './helpers';
import { FtrProviderContext } from '../../../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  // Failing: See https://github.com/elastic/kibana/issues/196492
  describe.skip('Note - Saved Objects', () => {
    const es = getService('es');

    before(() => kibanaServer.savedObjects.cleanStandardList());
    after(() => kibanaServer.savedObjects.cleanStandardList());

    describe('create a note', () => {
      it('should return a timelineId, noteId and version', async () => {
        const myNote = 'world test';
        const response = await supertest
          .patch('/api/note')
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

      it('if noteId exist update note and return existing noteId and new version', async () => {
        const myNote = 'world test';
        const response = await supertest
          .patch('/api/note')
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
          .patch('/api/note')
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
        await deleteAllNotes(es);
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
          .get(`/api/note?documentIds=${eventId1}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get(`/api/note?documentIds=${eventId1}&documentIds=${eventId2}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get(`/api/note?savedObjectIds=${timelineId1}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get(`/api/note?savedObjectIds=${timelineId1}&savedObjectIds=${timelineId2}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get('/api/note')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount } = response.body;

        expect(totalCount).to.be(4);
      });

      it('should retrieve notes considering perPage query parameter', async () => {
        await Promise.all([
          createNote(supertest, { text: 'first note' }),
          createNote(supertest, { text: 'second note' }),
          createNote(supertest, { text: 'third note' }),
        ]);

        const response = await supertest
          .get('/api/note?perPage=1')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

        expect(totalCount).to.be(3);
        expect(notes.length).to.be(1);
      });

      it('should retrieve considering page query parameter', async () => {
        await createNote(supertest, { text: 'first note' });
        await createNote(supertest, { text: 'second note' });
        await createNote(supertest, { text: 'third note' });

        const response = await supertest
          .get('/api/note?perPage=1&page=2')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

        expect(totalCount).to.be(3);
        expect(notes.length).to.be(1);
        expect(notes[0].note).to.be('second note');
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
          .get('/api/note?search=event')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount } = response.body;

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
          .get('/api/note?sortField=eventId')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get('/api/note?sortField=eventId&sortOrder=desc')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

        expect(totalCount).to.be(3);
        expect(notes[0].eventId).to.be('3');
        expect(notes[1].eventId).to.be('2');
        expect(notes[2].eventId).to.be('1');
      });

      // skipped https://github.com/elastic/kibana/issues/196896
      describe('@skipInServerless', () => {
        // TODO we need to figure out how to retrieve the uid of the current user in the test environment
        it.skip('should retrieve all notes that have been created by a specific user', async () => {
          await Promise.all([
            createNote(supertest, { text: 'first note' }),
            createNote(supertest, { text: 'second note' }),
          ]);

          const response = await supertest
            .get('/api/note?createdByFilter=elastic')
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31');
          const { totalCount } = response.body;

          expect(totalCount).to.be(2);
        });
      });

      // TODO we need to figure out how to create another user in the test environment
      it.skip('should return nothing if no notes have been created by that user', async () => {
        await Promise.all([
          createNote(supertest, { text: 'first note' }),
          createNote(supertest, { text: 'second note' }),
        ]);

        const response = await supertest
          .get('/api/note?createdByFilter=user1')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount } = response.body;

        expect(totalCount).to.be(0);
      });

      it('should return error if user does not exist', async () => {
        await Promise.all([
          createNote(supertest, { text: 'first note' }),
          createNote(supertest, { text: 'second note' }),
        ]);

        const response = await supertest
          .get('/api/note?createdByFilter=wrong_user')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        expect(response.body).to.not.have.property('totalCount');
        expect(response.body).to.not.have.property('notes');
        expect(response.body.message).to.be('User with uid wrong_user not found');
        expect(response.body.status_code).to.be(500);
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
          .get('/api/note?associatedFilter=document_only')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get('/api/note?associatedFilter=saved_object_only')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get('/api/note?associatedFilter=document_and_saved_object')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
          .get('/api/note?associatedFilter=orphan')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31');

        const { totalCount, notes } = response.body;

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
