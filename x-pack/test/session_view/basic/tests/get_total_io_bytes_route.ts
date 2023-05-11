/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GET_TOTAL_IO_BYTES_ROUTE } from '@kbn/session-view-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const MOCK_INDEX = 'logs-endpoint.events.process*';
const MOCK_SESSION_START_TIME = '2022-05-08T13:44:00.13Z';
const MOCK_SESSION_ENTITY_ID =
  'MDEwMTAxMDEtMDEwMS0wMTAxLTAxMDEtMDEwMTAxMDEwMTAxLTUyMDU3LTEzMjk2NDkxMDQwLjEzMDAwMDAwMA==';
const MOCK_TOTAL_BYTES = 8192; // sum of total_captured_bytes field in io_events es archive

// eslint-disable-next-line import/no-default-export
export default function getTotalIOBytesTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe(`Session view - ${GET_TOTAL_IO_BYTES_ROUTE} - with a basic license`, () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/session_view/process_events');
      await esArchiver.load('x-pack/test/functional/es_archives/session_view/io_events');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/session_view/process_events');
      await esArchiver.unload('x-pack/test/functional/es_archives/session_view/io_events');
    });

    it(`${GET_TOTAL_IO_BYTES_ROUTE} returns a page of IO events`, async () => {
      const response = await supertest.get(GET_TOTAL_IO_BYTES_ROUTE).set('kbn-xsrf', 'foo').query({
        index: MOCK_INDEX,
        sessionEntityId: MOCK_SESSION_ENTITY_ID,
        sessionStartTime: MOCK_SESSION_START_TIME,
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(MOCK_TOTAL_BYTES);
    });

    it(`${GET_TOTAL_IO_BYTES_ROUTE} returns 0 for invalid query`, async () => {
      const response = await supertest.get(GET_TOTAL_IO_BYTES_ROUTE).set('kbn-xsrf', 'foo').query({
        index: MOCK_INDEX,
        sessionStartTime: MOCK_SESSION_START_TIME,
        sessionEntityId: 'xyz',
      });
      expect(response.status).to.be(200);
      expect(response.body.total).to.be(0);
    });
  });
}
