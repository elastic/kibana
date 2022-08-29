/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('Pinned Events - Saved Objects', () => {
    before(() => kibanaServer.savedObjects.cleanStandardList());
    after(() => kibanaServer.savedObjects.cleanStandardList());

    describe('Pinned an event', () => {
      it('return a timelineId, timelineVersion, pinnedEventId and version', async () => {
        const response = await supertest.patch('/api/pinned_event').set('kbn-xsrf', 'true').send({
          pinnedEventId: null,
          eventId: 'bv4QSGsB9v5HJNSH-7fi',
        });
        const { eventId, pinnedEventId, timelineId, timelineVersion, version } =
          response.body.data && response.body.data.persistPinnedEventOnTimeline;

        expect(eventId).to.be('bv4QSGsB9v5HJNSH-7fi');
        expect(pinnedEventId).to.not.be.empty();
        expect(timelineId).to.not.be.empty();
        expect(timelineVersion).to.not.be.empty();
        expect(version).to.not.be.empty();
      });
    });

    describe('Unpinned an event', () => {
      it('return null', async () => {
        const response = await supertest.patch('/api/pinned_event').set('kbn-xsrf', 'true').send({
          pinnedEventId: null,
          eventId: 'bv4QSGsB9v5HJNSH-7fi',
        });
        const { eventId, pinnedEventId } =
          response.body.data && response.body.data.persistPinnedEventOnTimeline;

        const responseToTest = await supertest
          .patch('/api/pinned_event')
          .set('kbn-xsrf', 'true')
          .send({
            pinnedEventId,
            eventId,
          });
        expect(responseToTest.body.data!.persistPinnedEventOnTimeline).to.be(null);
      });
    });
  });
}
