/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IO_EVENTS_ROUTE, CURRENT_API_VERSION } from '@kbn/session-view-plugin/common/constants';
import type { FtrProviderContext } from '../../common/ftr_provider_context';

const MOCK_INDEX = 'logs-endpoint.events.process*';
const MOCK_SESSION_START_TIME = '2022-05-08T13:44:00.13Z';
const MOCK_SESSION_ENTITY_ID =
  'MDEwMTAxMDEtMDEwMS0wMTAxLTAxMDEtMDEwMTAxMDEwMTAxLTUyMDU3LTEzMjk2NDkxMDQwLjEzMDAwMDAwMA==';
const MOCK_IO_EVENT_TOTAL = 8;
const MOCK_CURSOR = '2022-05-08T13:44:35.570Z';
const MOCK_PAGE_SIZE = 2;

export default function ioEventsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  function getTestRoute() {
    return supertest
      .get(IO_EVENTS_ROUTE)
      .set('kbn-xsrf', 'foo')
      .set('Elastic-Api-Version', CURRENT_API_VERSION);
  }

  // Helper function to verify process args are normalized to arrays
  function verifyProcessArgsAreArrays(events: any[]) {
    events
      .filter((event) => event._source?.event?.kind === 'event' && event._source?.process)
      .forEach((event) => {
        const process = event._source.process;

        // Verify main process args is always an array
        expect(Array.isArray(process.args)).to.be(true);
        expect(process.args.length).to.be.greaterThan(0);

        // Verify nested process fields have args as arrays
        const nestedFields = ['parent', 'session_leader', 'entry_leader', 'group_leader'];
        nestedFields.forEach((field) => {
          const nestedProcess = process[field];
          expect(Array.isArray(nestedProcess.args)).to.be(true);
          expect(nestedProcess.args.length).to.be.greaterThan(0);
        });
      });
  }

  describe(`Session view - ${IO_EVENTS_ROUTE} - with a basic license`, () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/session_view/process_events'
      );
      await esArchiver.load(
        'x-pack/solutions/security/test/fixtures/es_archives/session_view/io_events'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/session_view/process_events'
      );
      await esArchiver.unload(
        'x-pack/solutions/security/test/fixtures/es_archives/session_view/io_events'
      );
    });

    it(`${IO_EVENTS_ROUTE} fails when an invalid api version is specified`, async () => {
      const response = await supertest
        .get(IO_EVENTS_ROUTE)
        .set('kbn-xsrf', 'foo')
        .set('Elastic-Api-Version', '999999')
        .query({
          index: MOCK_INDEX,
          sessionEntityId: MOCK_SESSION_ENTITY_ID,
          sessionStartTime: MOCK_SESSION_START_TIME,
        });
      expect(response.status).to.be(400);
    });

    it(`${IO_EVENTS_ROUTE} returns a page of IO events`, async () => {
      const response = await getTestRoute().query({
        index: MOCK_INDEX,
        sessionEntityId: MOCK_SESSION_ENTITY_ID,
        sessionStartTime: MOCK_SESSION_START_TIME,
        pageSize: MOCK_PAGE_SIZE,
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(MOCK_IO_EVENT_TOTAL);
      expect(response.body.events.length).to.be(MOCK_PAGE_SIZE);

      // ensure sorting timestamp ascending
      let lastSort = 0;
      response.body.events.forEach((hit: any) => {
        if (hit.sort < lastSort) {
          throw new Error('events were not sorted by timestamp ascending');
        }

        lastSort = hit.sort;
      });
    });

    it(`${IO_EVENTS_ROUTE} returns a page of IO events (w cursor)`, async () => {
      const response = await getTestRoute().query({
        index: MOCK_INDEX,
        sessionEntityId: MOCK_SESSION_ENTITY_ID,
        sessionStartTime: MOCK_SESSION_START_TIME,
        pageSize: MOCK_PAGE_SIZE,
        cursor: MOCK_CURSOR,
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(MOCK_IO_EVENT_TOTAL);

      // since our cursor is last event the result set size should only be 1
      expect(response.body.events.length).to.be(1);
    });

    it(`${IO_EVENTS_ROUTE} returns a page of IO events with normalized args`, async () => {
      // Pick event where process args and nested args is "string-io-parent-args"
      const response = await getTestRoute().query({
        index: MOCK_INDEX,
        sessionEntityId: MOCK_SESSION_ENTITY_ID,
        sessionStartTime: '2022-05-08T00:00:00.570Z',
        pageSize: MOCK_PAGE_SIZE,
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(9);
      expect(response.body.events.length).to.be(MOCK_PAGE_SIZE);

      // ensure sorting timestamp ascending
      let lastSort = 0;
      response.body.events.forEach((hit: any) => {
        if (hit.sort < lastSort) {
          throw new Error('events were not sorted by timestamp ascending');
        }

        lastSort = hit.sort;
      });

      // Verify that process args fields are normalized to arrays
      verifyProcessArgsAreArrays(response.body.events);
      expect(
        response.body.events.some(
          (ev: any) =>
            ev._source.process.args.includes('single-arg') &&
            ev._source.process.parent.args.includes('single-arg')
        )
      ).to.be(true);
    });
  });
}
