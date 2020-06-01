/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import gql from 'graphql-tag';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { persistTimelineNoteMutation } from '../../../../../plugins/security_solution/public/timelines/containers/notes/persist.gql_query';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');

  describe('Note - Saved Objects', () => {
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('create a note', () => {
      it('should return a timelineId, timelineVersion, noteId and version', async () => {
        const myNote = 'world test';
        const response = await client.mutate<any>({
          mutation: persistTimelineNoteMutation,
          variables: {
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: null },
          },
        });
        const { note, noteId, timelineId, timelineVersion, version } =
          response.data && response.data.persistNote.note;

        expect(note).to.be(myNote);
        expect(noteId).to.not.be.empty();
        expect(timelineId).to.not.be.empty();
        expect(timelineVersion).to.not.be.empty();
        expect(version).to.not.be.empty();
      });

      it('if noteId exist update note and return existing noteId and new version', async () => {
        const myNote = 'world test';
        const response = await client.mutate<any>({
          mutation: persistTimelineNoteMutation,
          variables: {
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: null },
          },
        });

        const { noteId, timelineId, version } = response.data && response.data.persistNote.note;

        const myNewNote = 'new world test';
        const responseToTest = await client.mutate<any>({
          mutation: persistTimelineNoteMutation,
          variables: {
            noteId,
            version,
            note: { note: myNewNote, timelineId },
          },
        });

        expect(responseToTest.data!.persistNote.note.note).to.be(myNewNote);
        expect(responseToTest.data!.persistNote.note.noteId).to.be(noteId);
        expect(responseToTest.data!.persistNote.note.version).to.not.be.eql(version);
      });
    });

    describe('Delete a note', () => {
      it('one note', async () => {
        const myNote = 'world test';
        const response = await client.mutate<any>({
          mutation: persistTimelineNoteMutation,
          variables: {
            noteId: null,
            version: null,
            note: { note: myNote, timelineId: null },
          },
        });

        const { noteId } = response.data && response.data.persistNote.note;

        const responseToTest = await client.mutate<any>({
          mutation: deleteNoteMutation,
          variables: {
            id: [noteId],
          },
        });

        expect(responseToTest.data!.deleteNote).to.be(true);
      });
    });
  });
}

const deleteNoteMutation = gql`
  mutation DeleteNoteMutation($id: [ID!]!) {
    deleteNote(id: $id)
  }
`;
