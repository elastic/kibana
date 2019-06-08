/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import monitorsWithLocation from './graphql/fixtures/monitors_with_location';
import { monitorListQueryString } from '../../../../plugins/uptime/public/queries';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('location docs', () => {
    const archive = 'uptime/location';

    before('load location documents', async () => await esArchiver.load(archive));
    after('unload location documents', async () => await esArchiver.unload(archive));

    it('should load location-aware heartbeat documents', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: monitorListQueryString,
        variables: {
          dateRangeStart: '2019-06-03T00:40:08.078Z',
          dateRangeEnd: '2019-06-03T23:00:16.078Z',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(monitorsWithLocation);
    });
  });
}
