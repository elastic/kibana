/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monitorChartsQueryString } from '../../../../../legacy/plugins/uptime/public/queries';
import { expectFixtureEql } from './helpers/expect_fixture_eql';

export default function({ getService }) {
  describe('monitorCharts query', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    const supertest = getService('supertest');

    it('will fetch a series of data points for monitor duration and status', async () => {
      const getMonitorChartsQuery = {
        operationName: 'MonitorCharts',
        query: monitorChartsQueryString,
        variables: {
          dateRangeStart: '2019-09-11T03:31:04.380Z',
          dateRangeEnd: '2019-09-11T03:40:34.410Z',
          monitorId: '0002-up',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorChartsQuery });

      expectFixtureEql(data, 'monitor_charts');
    });

    it('will fetch empty sets for a date range with no data', async () => {
      const getMonitorChartsQuery = {
        operationName: 'MonitorCharts',
        query: monitorChartsQueryString,
        variables: {
          dateRangeStart: '1999-09-11T03:31:04.380Z',
          dateRangeEnd: '1999-09-11T03:40:34.410Z',
          monitorId: '0002-up',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorChartsQuery });

      expectFixtureEql(data, 'monitor_charts_empty_sets');
    });
  });
}
