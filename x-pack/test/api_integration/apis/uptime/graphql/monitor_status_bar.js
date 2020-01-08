/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monitorStatusBarQueryString } from '../../../../../legacy/plugins/uptime/public/queries';
import { expectFixtureEql } from './helpers/expect_fixture_eql';

export default function({ getService }) {
  describe('monitorStatusBar query', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    const supertest = getService('supertest');

    it('returns the status for all monitors with no ID filtering', async () => {
      const getMonitorStatusBarQuery = {
        operationName: 'MonitorStatus',
        query: monitorStatusBarQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
        },
      };
      const {
        body: {
          data: { monitorStatus: responseData },
        },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorStatusBarQuery });

      expectFixtureEql(responseData, 'monitor_status_all', res =>
        res.forEach(i => delete i.millisFromNow)
      );
    });

    it('returns the status for only the given monitor', async () => {
      const getMonitorStatusBarQuery = {
        operationName: 'MonitorStatus',
        query: monitorStatusBarQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
          monitorId: '0002-up',
        },
      };
      const res = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorStatusBarQuery });

      expectFixtureEql(res.body.data.monitorStatus, 'monitor_status_by_id');
    });
  });
}
