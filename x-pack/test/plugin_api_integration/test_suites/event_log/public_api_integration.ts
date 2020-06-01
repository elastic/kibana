/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, omit, chunk, isEmpty } from 'lodash';
import uuid from 'uuid';
import expect from '@kbn/expect/expect.js';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { IEvent } from '../../../../plugins/event_log/server';
import { IValidatedEvent } from '../../../../plugins/event_log/server/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ({ getService }: FtrProviderContext) {
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
        const {
          body: { data, total },
        } = await findEvents(id, {});

        expect(data.length).to.be(2);
        expect(total).to.be(2);

        assertEventsFromApiMatchCreatedEvents(data, expectedEvents);
      });
    });

    it('should support pagination for events', async () => {
      const id = uuid.v4();

      const expectedEvents = await logFakeEvents(id, 6);

      await retry.try(async () => {
        const {
          body: { data: foundEvents },
        } = await findEvents(id, {});

        expect(foundEvents.length).to.be(6);
      });

      const [expectedFirstPage, expectedSecondPage] = chunk(expectedEvents, 3);

      const {
        body: { data: firstPage },
      } = await findEvents(id, { per_page: 3 });

      expect(firstPage.length).to.be(3);
      assertEventsFromApiMatchCreatedEvents(firstPage, expectedFirstPage);

      const {
        body: { data: secondPage },
      } = await findEvents(id, { per_page: 3, page: 2 });

      expect(secondPage.length).to.be(3);
      assertEventsFromApiMatchCreatedEvents(secondPage, expectedSecondPage);
    });

    it('should support sorting by event end', async () => {
      const id = uuid.v4();

      const expectedEvents = await logFakeEvents(id, 6);

      await retry.try(async () => {
        const {
          body: { data: foundEvents },
        } = await findEvents(id, { sort_field: 'event.end', sort_order: 'desc' });

        expect(foundEvents.length).to.be(expectedEvents.length);
        assertEventsFromApiMatchCreatedEvents(foundEvents, expectedEvents.reverse());
      });
    });

    it('should support date ranges for events', async () => {
      const id = uuid.v4();

      // write a document that shouldn't be found in the inclusive date range search
      const firstEvent = fakeEvent(id);
      await logTestEvent(id, firstEvent);

      // wait a second, get the start time for the date range search
      await delay(1000);
      const start = new Date().toISOString();

      // write the documents that we should be found in the date range searches
      const expectedEvents = await logFakeEvents(id, 6);

      // get the end time for the date range search
      const end = new Date().toISOString();

      // write a document that shouldn't be found in the inclusive date range search
      await delay(1000);
      const lastEvent = fakeEvent(id);
      await logTestEvent(id, lastEvent);

      await retry.try(async () => {
        const {
          body: { data: foundEvents, total },
        } = await findEvents(id, {});

        expect(foundEvents.length).to.be(8);
        expect(total).to.be(8);
      });

      const {
        body: { data: eventsWithinRange },
      } = await findEvents(id, { start, end });

      expect(eventsWithinRange.length).to.be(expectedEvents.length);
      assertEventsFromApiMatchCreatedEvents(eventsWithinRange, expectedEvents);

      const {
        body: { data: eventsFrom },
      } = await findEvents(id, { start });

      expect(eventsFrom.length).to.be(expectedEvents.length + 1);
      assertEventsFromApiMatchCreatedEvents(eventsFrom, [...expectedEvents, lastEvent]);

      const {
        body: { data: eventsUntil },
      } = await findEvents(id, { end });

      expect(eventsUntil.length).to.be(expectedEvents.length + 1);
      assertEventsFromApiMatchCreatedEvents(eventsUntil, [firstEvent, ...expectedEvents]);
    });
  });

  async function findEvents(id: string, query: Record<string, any> = {}) {
    const uri = `/api/event_log/event_log_test/${id}/_find${
      isEmpty(query)
        ? ''
        : `?${Object.entries(query)
            .map(([key, val]) => `${key}=${val}`)
            .join('&')}`
    }`;
    log.debug(`calling ${uri}`);
    return await supertest.get(uri).set('kbn-xsrf', 'foo').expect(200);
  }

  function assertEventsFromApiMatchCreatedEvents(
    foundEvents: IValidatedEvent[],
    expectedEvents: IEvent[]
  ) {
    try {
      foundEvents.forEach((foundEvent: IValidatedEvent, index: number) => {
        expect(omit(foundEvent!.event ?? {}, 'start', 'end', 'duration')).to.eql(
          expectedEvents[index]!.event
        );
        expect(omit(foundEvent!.kibana ?? {}, 'server_uuid')).to.eql(expectedEvents[index]!.kibana);
        expect(foundEvent!.message).to.eql(expectedEvents[index]!.message);
      });
    } catch (ex) {
      log.debug(`failed to match ${JSON.stringify({ foundEvents, expectedEvents })}`);
      throw ex;
    }
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
        },
        kibana: {
          saved_objects: [
            {
              rel: 'primary',
              namespace: 'default',
              type: 'event_log_test',
              id,
            },
          ],
        },
        message: `test ${moment().toISOString()}`,
      },
      overrides
    );
  }

  async function logFakeEvents(savedObjectId: string, eventsToLog: number): Promise<IEvent[]> {
    const expectedEvents: IEvent[] = [];
    for (let index = 0; index < eventsToLog; index++) {
      const event = fakeEvent(savedObjectId);
      await logTestEvent(savedObjectId, event);
      expectedEvents.push(event);
    }
    return expectedEvents;
  }
}
