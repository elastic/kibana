/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Note - Saved Objects', () => {
    beforeEach(() => esArchiver.load('x-pack/test/functional/es_archives/empty_kibana'));
    afterEach(() => esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana'));

    describe('create a note', () => {
      it('should return a timelineId, timelineVersion, noteId and version', async () => {
        const myNote = 'world test';
        const response = await supertest
          .patch('/api/note')
          .set('kbn-xsrf', 'true')
          .send({
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: null },
          });

        const { note, noteId, timelineId, timelineVersion, version } =
          response.body.data && response.body.data.persistNote.note;

        expect(note).to.be(myNote);
        expect(noteId).to.not.be.empty();
        expect(timelineId).to.not.be.empty();
        expect(timelineVersion).to.not.be.empty();
        expect(version).to.not.be.empty();
      });

      it('if noteId exist update note and return existing noteId and new version', async () => {
        const myNote = 'world test';
        const response = await supertest
          .patch('/api/note')
          .set('kbn-xsrf', 'true')
          .send({
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: null },
          });

        const { noteId, timelineId, version } =
          response.body.data && response.body.data.persistNote.note;

        const myNewNote = 'new world test';
        const responseToTest = await supertest
          .patch('/api/note')
          .set('kbn-xsrf', 'true')
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
  });
}
