/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IO_EVENTS_ROUTE } from '@kbn/session-view-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const MOCK_SESSION_ENTITY_ID = '1';
const MOCK_IO_EVENT_TOTAL = 8;
const MOCK_CURSOR_OF_SECOND_EVENT = '2020-12-16T15:16:30.570Z';

// eslint-disable-next-line import/no-default-export
export default function ioEventsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe(`Session view - ${IO_EVENTS_ROUTE} - with a basic license`, () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/session_view/io_events');
    });

    after(async () => {
//      await esArchiver.unload('x-pack/test/functional/es_archives/session_view/io_events');
    });

    it(`${IO_EVENTS_ROUTE} returns a page of IO events`, async () => {
      const response = await supertest.get(IO_EVENTS_ROUTE).set('kbn-xsrf', 'foo').query({
        sessionEntityId: MOCK_SESSION_ENTITY_ID,
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(MOCK_IO_EVENT_TOTAL);
      expect(response.body.events.length).to.be(MOCK_IO_EVENT_TOTAL);

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
        sessionEntityId: MOCK_SESSION_ENTITY_ID,
        cursor: MOCK_CURSOR_OF_SECOND_EVENT,
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(MOCK_IO_EVENT_TOTAL);

      // since our cursor is the timestamp of the second event, the first result will be event #3 (thus the - 2)
      expect(response.body.events.length).to.be(MOCK_IO_EVENT_TOTAL - 2);
    });
  });
}
