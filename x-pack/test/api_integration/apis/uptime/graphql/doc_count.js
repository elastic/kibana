/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { docCountQueryString } from '../../../../../legacy/plugins/uptime/public/queries';
import { expectFixtureEql } from './helpers/expect_fixture_eql';

export default function({ getService }) {
  describe('docCount query', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    const supertest = getService('supertest');

    it(`will fetch the index's count`, async () => {
      const getDocCountQuery = {
        operationName: null,
        query: docCountQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getDocCountQuery });

      expectFixtureEql(data, 'doc_count');
    });
  });
}
