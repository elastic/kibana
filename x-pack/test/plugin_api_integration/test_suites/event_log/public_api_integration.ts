/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, omit, times, chunk } from 'lodash';
import uuid from 'uuid';
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';
import { IEvent } from '../../../../plugins/event_log/server';
import { IValidatedEvent } from '../../../../plugins/event_log/server/types';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');

  describe('Event Log public API', () => {
    it('should allow querying for events by Saved Object', async () => {
      const id = uuid.v4();

      const expectedEvents = [fakeEvent(id), fakeEvent(id)];

      await logTestEvent(id, expectedEvents[0]);
      await logTestEvent(id, expectedEvents[1]);

      await retry.try(async () => {
        const { body: foundEvents } = await supertest
          .get(`/api/event_log/event_log_test/${id}/_find`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(foundEvents.length).to.be(2);

        assertEventsFromApiMatchCreatedEvents(foundEvents, expectedEvents);
      });
    });

    it('should support pagination for events', async () => {
      const id = uuid.v4();

      const [firstExpectedEvent, ...expectedEvents] = times(6, () => fakeEvent(id));
      // run one first to create the SO and avoid clashes
      await logTestEvent(id, firstExpectedEvent);
      await Promise.all(expectedEvents.map(event => logTestEvent(id, event)));

      await retry.try(async () => {
        const { body: foundEvents } = await supertest
          .get(`/api/event_log/event_log_test/${id}/_find`)
          .set('kbn-xsrf', 'foo')
          .expect(200);

        expect(foundEvents.length).to.be(6);
      });

      const [expectedFirstPage, expectedSecondPage] = chunk(
        [firstExpectedEvent, ...expectedEvents],
        3
      );

      const { body: firstPage } = await supertest
        .get(`/api/event_log/event_log_test/${id}/_find?per_page=3`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(firstPage.length).to.be(3);
      assertEventsFromApiMatchCreatedEvents(firstPage, expectedFirstPage);

      const { body: secondPage } = await supertest
        .get(`/api/event_log/event_log_test/${id}/_find?per_page=3&page=2`)
        .set('kbn-xsrf', 'foo')
        .expect(200);

      expect(secondPage.length).to.be(3);
      assertEventsFromApiMatchCreatedEvents(secondPage, expectedSecondPage);
    });
  });

  function assertEventsFromApiMatchCreatedEvents(
    foundEvents: IValidatedEvent[],
    expectedEvents: IEvent[]
  ) {
    foundEvents.forEach((foundEvent: IValidatedEvent, index: number) => {
      expect(foundEvent!.event).to.eql(expectedEvents[index]!.event);
      expect(omit(foundEvent!.kibana ?? {}, 'server_uuid')).to.eql(expectedEvents[index]!.kibana);
      expect(foundEvent!.message).to.eql(expectedEvents[index]!.message);
    });
  }

  async function logTestEvent(id: string, event: IEvent) {
    log.debug(`Logging Event for Saved Object ${id}`);
    return await supertest
      .post(`/api/log_event_fixture/${id}/_log`)
      .set('kbn-xsrf', 'foo')
      .send(event)
      .expect(200);
  }

  function fakeEvent(id: string, overrides: Partial<IEvent> = {}): IEvent {
    return merge(
      {
        event: {
          provider: 'event_log_fixture',
          action: 'test',
          start: new Date().toISOString(),
          end: new Date().toISOString(),
          duration: 1000000,
        },
        kibana: {
          namespace: 'default',
          saved_objects: [
            {
              type: 'event_log_test',
              id,
            },
          ],
        },
        message: `test ${new Date().toISOString()}`,
      },
      overrides
    );
  }
}
