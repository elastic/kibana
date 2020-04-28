/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge, omit, times, chunk, isEmpty } from 'lodash';
import uuid from 'uuid';
import expect from '@kbn/expect/expect.js';
import moment, { Moment } from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { IEvent } from '../../../../plugins/event_log/server';
import { IValidatedEvent } from '../../../../plugins/event_log/server/types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

      const timestamp = moment();
      const [firstExpectedEvent, ...expectedEvents] = times(6, () =>
        fakeEvent(id, fakeEventTiming(timestamp.add(1, 's')))
      );
      // run one first to create the SO and avoid clashes
      await logTestEvent(id, firstExpectedEvent);
      await Promise.all(expectedEvents.map(event => logTestEvent(id, event)));

      await retry.try(async () => {
        const {
          body: { data: foundEvents },
        } = await findEvents(id, {});

        expect(foundEvents.length).to.be(6);
      });

      const [expectedFirstPage, expectedSecondPage] = chunk(
        [firstExpectedEvent, ...expectedEvents],
        3
      );

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

      const timestamp = moment();
      const [firstExpectedEvent, ...expectedEvents] = times(6, () =>
        fakeEvent(id, fakeEventTiming(timestamp.add(1, 's')))
      );
      // run one first to create the SO and avoid clashes
      await logTestEvent(id, firstExpectedEvent);
      await Promise.all(expectedEvents.map(event => logTestEvent(id, event)));

      await retry.try(async () => {
        const {
          body: { data: foundEvents },
        } = await findEvents(id, { sort_field: 'event.end', sort_order: 'desc' });

        expect(foundEvents.length).to.be(6);
        assertEventsFromApiMatchCreatedEvents(
          foundEvents,
          [firstExpectedEvent, ...expectedEvents].reverse()
        );
      });
    });

    it('should support date ranges for events', async () => {
      const id = uuid.v4();

      const timestamp = moment();

      const firstEvent = fakeEvent(id, fakeEventTiming(timestamp));
      await logTestEvent(id, firstEvent);
      await delay(100);

      const start = timestamp.add(1, 's').toISOString();

      const expectedEvents = times(6, () => fakeEvent(id, fakeEventTiming(timestamp.add(1, 's'))));
      await Promise.all(expectedEvents.map(event => logTestEvent(id, event)));

      const end = timestamp.add(1, 's').toISOString();

      await delay(100);
      const lastEvent = fakeEvent(id, fakeEventTiming(timestamp.add(1, 's')));
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
    return await supertest
      .get(uri)
      .set('kbn-xsrf', 'foo')
      .expect(200);
  }

  function assertEventsFromApiMatchCreatedEvents(
    foundEvents: IValidatedEvent[],
    expectedEvents: IEvent[]
  ) {
    try {
      foundEvents.forEach((foundEvent: IValidatedEvent, index: number) => {
        expect(foundEvent!.event).to.eql(expectedEvents[index]!.event);
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

  function fakeEventTiming(start: Moment): Partial<IEvent> {
    return {
      event: {
        start: start.toISOString(),
        end: start
          .clone()
          .add(500, 'milliseconds')
          .toISOString(),
      },
    };
  }

  function fakeEvent(id: string, overrides: Partial<IEvent> = {}): IEvent {
    const start = moment().toISOString();
    const end = moment().toISOString();
    return merge(
      {
        event: {
          provider: 'event_log_fixture',
          action: 'test',
          start,
          end,
          duration: 1000000,
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
}
