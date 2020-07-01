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
  const spacesService = getService('spaces');
  const esArchiver = getService('esArchiver');

  describe('Event Log public API', () => {
    before(async () => {
      await spacesService.create({
        id: 'namespace-a',
        name: 'Space A',
        disabledFeatures: [],
      });
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    for (const namespace of [undefined, 'namespace-a']) {
      const namespaceName = namespace === undefined ? 'default' : namespace;

      describe(`namespace: ${namespaceName}`, () => {
        it('should allow querying for events by Saved Object', async () => {
          const id = uuid.v4();

          const expectedEvents = [fakeEvent(namespace, id), fakeEvent(namespace, id)];

          await logTestEvent(namespace, id, expectedEvents[0]);
          await logTestEvent(namespace, id, expectedEvents[1]);

          await retry.try(async () => {
            const {
              body: { data, total },
            } = await findEvents(namespace, id, {});

            expect(data.length).to.be(2);
            expect(total).to.be(2);

            assertEventsFromApiMatchCreatedEvents(data, expectedEvents);
          });
        });

        it('should support pagination for events', async () => {
          const id = uuid.v4();

          const expectedEvents = await logFakeEvents(namespace, id, 6);

          await retry.try(async () => {
            const {
              body: { data: foundEvents },
            } = await findEvents(namespace, id, {});

            expect(foundEvents.length).to.be(6);
          });

          const [expectedFirstPage, expectedSecondPage] = chunk(expectedEvents, 3);

          const {
            body: { data: firstPage },
          } = await findEvents(namespace, id, { per_page: 3 });

          expect(firstPage.length).to.be(3);
          assertEventsFromApiMatchCreatedEvents(firstPage, expectedFirstPage);

          const {
            body: { data: secondPage },
          } = await findEvents(namespace, id, { per_page: 3, page: 2 });

          expect(secondPage.length).to.be(3);
          assertEventsFromApiMatchCreatedEvents(secondPage, expectedSecondPage);
        });

        it('should support sorting by event end', async () => {
          const id = uuid.v4();

          const expectedEvents = await logFakeEvents(namespace, id, 6);

          await retry.try(async () => {
            const {
              body: { data: foundEvents },
            } = await findEvents(namespace, id, { sort_field: 'event.end', sort_order: 'desc' });

            expect(foundEvents.length).to.be(expectedEvents.length);
            assertEventsFromApiMatchCreatedEvents(foundEvents, expectedEvents.reverse());
          });
        });

        it('should support date ranges for events', async () => {
          const id = uuid.v4();

          // write a document that shouldn't be found in the inclusive date range search
          const firstEvent = fakeEvent(namespace, id);
          await logTestEvent(namespace, id, firstEvent);

          // wait a second, get the start time for the date range search
          await delay(1000);
          const start = new Date().toISOString();

          // write the documents that we should be found in the date range searches
          const expectedEvents = await logFakeEvents(namespace, id, 6);

          // get the end time for the date range search
          const end = new Date().toISOString();

          // write a document that shouldn't be found in the inclusive date range search
          await delay(1000);
          const lastEvent = fakeEvent(namespace, id);
          await logTestEvent(namespace, id, lastEvent);

          await retry.try(async () => {
            const {
              body: { data: foundEvents, total },
            } = await findEvents(namespace, id, {});

            expect(foundEvents.length).to.be(8);
            expect(total).to.be(8);
          });

          const {
            body: { data: eventsWithinRange },
          } = await findEvents(namespace, id, { start, end });

          expect(eventsWithinRange.length).to.be(expectedEvents.length);
          assertEventsFromApiMatchCreatedEvents(eventsWithinRange, expectedEvents);

          const {
            body: { data: eventsFrom },
          } = await findEvents(namespace, id, { start });

          expect(eventsFrom.length).to.be(expectedEvents.length + 1);
          assertEventsFromApiMatchCreatedEvents(eventsFrom, [...expectedEvents, lastEvent]);

          const {
            body: { data: eventsUntil },
          } = await findEvents(namespace, id, { end });

          expect(eventsUntil.length).to.be(expectedEvents.length + 1);
          assertEventsFromApiMatchCreatedEvents(eventsUntil, [firstEvent, ...expectedEvents]);
        });
      });
    }
  });

  async function findEvents(
    namespace: string | undefined,
    id: string,
    query: Record<string, any> = {}
  ) {
    const urlPrefix = urlPrefixFromNamespace(namespace);
    const url = `${urlPrefix}/api/event_log/event_log_test/${id}/_find${
      isEmpty(query)
        ? ''
        : `?${Object.entries(query)
            .map(([key, val]) => `${key}=${val}`)
            .join('&')}`
    }`;
    log.debug(`Finding Events for Saved Object with ${url}`);
    return await supertest.get(url).set('kbn-xsrf', 'foo').expect(200);
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

  async function logTestEvent(namespace: string | undefined, id: string, event: IEvent) {
    const urlPrefix = urlPrefixFromNamespace(namespace);
    const url = `${urlPrefix}/api/log_event_fixture/${id}/_log`;
    log.debug(`Logging Event for Saved Object with ${url} - ${JSON.stringify(event)}`);
    return await supertest.post(url).set('kbn-xsrf', 'foo').send(event).expect(200);
  }

  function fakeEvent(
    namespace: string | undefined,
    id: string,
    overrides: Partial<IEvent> = {}
  ): IEvent {
    const savedObject: any = {
      rel: 'primary',
      type: 'event_log_test',
      id,
    };
    if (namespace !== undefined) {
      savedObject.namespace = namespace;
    }

    return merge(
      {
        event: {
          provider: 'event_log_fixture',
          action: 'test',
        },
        kibana: {
          saved_objects: [savedObject],
        },
        message: `test ${moment().toISOString()}`,
      },
      overrides
    );
  }

  async function logFakeEvents(
    namespace: string | undefined,
    savedObjectId: string,
    eventsToLog: number
  ): Promise<IEvent[]> {
    const expectedEvents: IEvent[] = [];
    for (let index = 0; index < eventsToLog; index++) {
      const event = fakeEvent(namespace, savedObjectId);
      await logTestEvent(namespace, savedObjectId, event);
      expectedEvents.push(event);
    }
    return expectedEvents;
  }
}

function urlPrefixFromNamespace(namespace: string | undefined): string {
  if (namespace === undefined) return '';
  return `/s/${namespace}`;
}
