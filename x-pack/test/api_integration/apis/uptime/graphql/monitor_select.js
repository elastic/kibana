/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getLatestMonitorsQueryString } from '../../../../../plugins/uptime/public/components/queries/monitor_select/get_latest_monitors';
import monitorSelect from './fixtures/monitor_select';

export default function ({ getService }) {
  describe('monitorSelect query', () => {
    const supertest = getService('supertest');
    const esArchiver = getService('esArchiver');
    const archive = 'uptime/full_heartbeat';
    before('load heartbeat data', () => esArchiver.load(archive));
    after('unload heartbeat index', () => esArchiver.unload(archive));

    it('returns a list of the monitors for the given date range', async () => {
      const getMonitorSelectQuery = {
        operationName: 'GetLatestMonitorQuery',
        query: getLatestMonitorsQueryString,
        variables: { dateRangeStart: 1547805782000, dateRangeEnd: 1547852582000 },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorSelectQuery });
      expect(data).to.eql(monitorSelect);
    });
  });
}
