/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PINNED_EVENT_URL } from '@kbn/security-solution-plugin/common/constants';
import TestAgent from 'supertest/lib/agent';
import { FtrProviderContextWithSpaces } from '../../../../ftr_provider_context_with_spaces';

export default function ({ getService }: FtrProviderContextWithSpaces) {
  const utils = getService('securitySolutionUtils');
  let supertest: TestAgent;

  describe('Pinned Events - Saved Objects', () => {
    before(async () => (supertest = await utils.createSuperTest()));

    describe('pin an event', () => {
      it('return a timelineId, pinnedEventId and version', async () => {
        const response = await supertest
          .patch(PINNED_EVENT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            pinnedEventId: null,
            timelineId: 'testId',
            eventId: 'bv4QSGsB9v5HJNSH-7fi',
          });
        const { eventId, pinnedEventId, timelineId, version } = response.body;

        expect(eventId).to.be('bv4QSGsB9v5HJNSH-7fi');
        expect(pinnedEventId).to.not.be.empty();
        expect(timelineId).to.be('testId');
        expect(version).to.not.be.empty();
      });
    });

    describe('unpin an event', () => {
      it('returns { unpinned: true }', async () => {
        const response = await supertest
          .patch(PINNED_EVENT_URL)
          .set('elastic-api-version', '2023-10-31')
          .set('kbn-xsrf', 'true')
          .send({
            pinnedEventId: null,
            eventId: 'bv4QSGsB9v5HJNSH-7fi',
            timelineId: 'testId',
          });
        const { eventId, pinnedEventId, timelineId } = response.body;

        const responseToTest = await supertest
          .patch(PINNED_EVENT_URL)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '2023-10-31')
          .send({
            pinnedEventId,
            eventId,
            timelineId,
          });
        expect(responseToTest.body).to.eql({ unpinned: true });
      });
    });
  });
}
