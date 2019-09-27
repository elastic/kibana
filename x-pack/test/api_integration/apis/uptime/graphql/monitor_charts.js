/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monitorChartsQueryString } from '../../../../../legacy/plugins/uptime/public/queries';
import { expectFixtureEql } from './expect_fixture_eql';

export default function ({ getService }) {
  describe('monitorCharts query', () => {
    const supertest = getService('supertest');

    it('will fetch a series of data points for monitor duration and status', async () => {
      const getMonitorChartsQuery = {
        operationName: 'MonitorCharts',
        query: monitorChartsQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
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
          dateRangeStart: '2002-01-28T17:40:08.078Z',
          dateRangeEnd: '2002-01-28T19:00:16.078Z',
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
