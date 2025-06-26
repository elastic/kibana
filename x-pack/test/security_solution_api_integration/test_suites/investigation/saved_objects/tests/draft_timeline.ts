/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { TIMELINE_DRAFT_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  let supertest: TestAgent;

  describe('Draft timeline - Saved Objects', () => {
    before(async () => (supertest = await utils.createSuperTest()));

    describe('Clean draft timelines', () => {
      it('returns a draft timeline if none exists', async () => {
        const response = await supertest
          .post(TIMELINE_DRAFT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            timelineType: 'default',
          });

        const { savedObjectId, version } = response.body.data && response.body;

        expect(savedObjectId).to.not.be.empty();
        expect(version).to.not.be.empty();
      });

      it('returns a draft timeline template if none exists', async () => {
        const response = await supertest
          .post(TIMELINE_DRAFT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            timelineType: 'template',
          });

        const {
          savedObjectId,
          version,
          timelineType,
          templateTimelineId,
          templateTimelineVersion,
        } = response.body.data && response.body;

        expect(savedObjectId).to.not.be.empty();
        expect(version).to.not.be.empty();
        expect(timelineType).to.be.equal('template');
        expect(templateTimelineVersion).to.not.be.equal(null);
        expect(templateTimelineId).to.not.be.empty();
      });

      it('returns a cleaned draft timeline if another one already exists', async () => {
        const response = await supertest
          .post(TIMELINE_DRAFT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            timelineType: 'default',
          });

        const {
          savedObjectId: initialSavedObjectId,
          pinnedEventIds: initialPinnedEventIds,
          noteIds: initialNoteIds,
          version: initialVersion,
        } = response.body.data && response.body;

        expect(initialPinnedEventIds).to.have.length(0, 'should not have any pinned events');
        expect(initialNoteIds).to.have.length(0, 'should not have any notes');

        // Adding notes and pinned events
        await supertest
          .patch('/api/note')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            noteId: null,
            version: null,
            note: { note: 'test note', timelineId: initialSavedObjectId },
          });
        await supertest
          .patch('/api/pinned_event')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            pinnedEventId: null,
            timelineId: initialSavedObjectId,
            eventId: 'bv4QSGsB9v5HJNSH-7fi',
          });

        const getTimelineRequest = await supertest
          .get(`/api/timeline?id=${initialSavedObjectId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send();

        const {
          pinnedEventIds,
          noteIds,
          status: newStatus,
        } = getTimelineRequest.body.data && getTimelineRequest.body;

        expect(newStatus).to.be.equal('draft', 'status should still be draft');
        expect(pinnedEventIds).to.have.length(1, 'should have one pinned event');
        expect(noteIds).to.have.length(1, 'should have one note');

        const cleanDraftTimelineRequest = await supertest
          .post(TIMELINE_DRAFT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            timelineType: 'default',
          });

        const {
          savedObjectId: cleanedSavedObjectId,
          pinnedEventIds: cleanedPinnedEventIds,
          noteIds: cleanedNoteIds,
          version: cleanedVersion,
        } = cleanDraftTimelineRequest.body.data && cleanDraftTimelineRequest.body;

        expect(cleanedPinnedEventIds).to.have.length(0, 'should not have pinned events anymore');
        expect(cleanedNoteIds).to.have.length(0, 'should not have notes anymore');
        expect(cleanedSavedObjectId).to.be.equal(
          initialSavedObjectId,
          'the savedObjectId should not have changed'
        );
        expect(cleanedVersion).not.to.be.equal(
          initialVersion,
          'should have a different version than initially'
        );
      });
    });
  });
}
