/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IO_EVENTS_ROUTE } from '@kbn/session-view-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const MOCK_INDEX = 'logs-endpoint.events.process*';
const MOCK_SESSION_START_TIME = '2022-05-08T13:44:00.13Z';
const MOCK_SESSION_ENTITY_ID =
  'MDEwMTAxMDEtMDEwMS0wMTAxLTAxMDEtMDEwMTAxMDEwMTAxLTUyMDU3LTEzMjk2NDkxMDQwLjEzMDAwMDAwMA==';
const MOCK_IO_EVENT_TOTAL = 8;
const MOCK_CURSOR = '2022-05-08T13:44:35.570Z';
const MOCK_PAGE_SIZE = 2;

// eslint-disable-next-line import/no-default-export
export default function ioEventsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe(`Session view - ${IO_EVENTS_ROUTE} - with a basic license`, () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/session_view/process_events');
      await esArchiver.load('x-pack/test/functional/es_archives/session_view/io_events');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/session_view/process_events');
      await esArchiver.unload('x-pack/test/functional/es_archives/session_view/io_events');
    });

    it(`${IO_EVENTS_ROUTE} returns a page of IO events`, async () => {
      const response = await supertest.get(IO_EVENTS_ROUTE).set('kbn-xsrf', 'foo').query({
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
      const response = await supertest.get(IO_EVENTS_ROUTE).set('kbn-xsrf', 'foo').query({
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
  });
}
