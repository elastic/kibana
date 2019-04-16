/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { monitorChartsQueryString } from '../../../../../plugins/uptime/public/queries';
import monitorCharts from './fixtures/monitor_charts';
import monitorChartsEmptySet from './fixtures/monitor_charts_empty_set';

export default function ({ getService }) {
  describe('monitorCharts query', () => {
    const supertest = getService('supertest');

    it('will fetch a series of data points for monitor duration and status', async () => {
      const getMonitorChartsQuery = {
        operationName: 'MonitorCharts',
        query: monitorChartsQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          monitorId: 'auto-http-0X131221E73F825974',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorChartsQuery });
      expect(data).to.eql(monitorCharts);
    });

    it('will fetch empty sets for a date range with no data', async () => {
      const getMonitorChartsQuery = {
        operationName: 'MonitorCharts',
        query: monitorChartsQueryString,
        variables: {
          dateRangeStart: '2002-01-28T17:40:08.078Z',
          dateRangeEnd: '2002-01-28T19:00:16.078Z',
          monitorId: 'auto-http-0X131221E73F825974',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorChartsQuery });
      expect(data).to.eql(monitorChartsEmptySet);
    });
  });
}
