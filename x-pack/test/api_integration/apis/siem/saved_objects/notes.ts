/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import gql from 'graphql-tag';

import { allTimelinesQuery } from '../../../../../legacy/plugins/siem/public/containers/timeline/all/index.gql_query';
import { persistTimelineNoteMutation } from '../../../../../legacy/plugins/siem/public/containers/timeline/notes/persist.gql_query';
import { GetAllTimeline } from '../../../../../legacy/plugins/siem/public/graphql/types';

import { KbnTestProvider } from '../types';

const notesPersistenceTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

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

      it('if noteId exist return existing timelineId, timelineVersion noteId and version', async () => {
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0 &&
          responseData.data.getAllTimeline.timeline[0] != null &&
          responseData.data.getAllTimeline.timeline[0]!.notes &&
          responseData.data.getAllTimeline.timeline[0]!.notes.length > 0 &&
          responseData.data.getAllTimeline.timeline[0]!.notes![0] != null
        ) {
          const {
            note,
            noteId,
            timelineId,
            timelineVersion,
            version,
          } = responseData.data.getAllTimeline.timeline![0]!.notes![0];
          const myNote = 'new world test';
          const response = await client.mutate<any>({
            mutation: persistTimelineNoteMutation,
            variables: {
              noteId,
              version,
              note: { note: myNote, timelineId },
            },
          });

          expect(response.data!.persistNote.note).to.be(note);
          expect(response.data!.persistNote.noteId).to.be(noteId);
          expect(response.data!.persistNote.timelineId).to.be(timelineId);
          expect(response.data!.persistNote.timelineVersion).to.be(timelineVersion);
          expect(response.data!.persistNote.version).to.be(version);
        }
      });
    });

    describe('Delete a note', () => {
      it('one note', async () => {
        const responseData = await client.query<GetAllTimeline.Query>({
          query: allTimelinesQuery,
          variables: {
            search: '',
            pageInfo: { pageIndex: 1, pageSize: 10 },
            sort: { sortField: 'updated', sortOrder: 'desc' },
          },
        });
        if (
          responseData.data.getAllTimeline.timeline &&
          responseData.data.getAllTimeline.timeline.length > 0 &&
          responseData.data.getAllTimeline.timeline[0] != null &&
          responseData.data.getAllTimeline.timeline[0]!.notes &&
          responseData.data.getAllTimeline.timeline[0]!.notes.length > 0 &&
          responseData.data.getAllTimeline.timeline[0]!.notes![0] != null
        ) {
          const { noteId } = responseData.data.getAllTimeline.timeline![0]!.notes![0];

          const response = await client.mutate<any>({
            mutation: deleteNoteMutation,
            variables: {
              noteId,
            },
          });

          expect(response.data).to.be(true);
        }
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default notesPersistenceTests;

const deleteNoteMutation = gql`
  mutation deleteNote($noteId: ID!) {
    deleteNote(id: $noteId)
  }
`;
