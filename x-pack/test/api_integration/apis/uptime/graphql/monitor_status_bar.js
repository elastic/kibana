/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
// eslint-disable-next-line max-len
import { getMonitorStatusBarQueryString } from '../../../../../plugins/uptime/public/components/queries/monitor_status_bar/get_monitor_status_bar';
import monitorStatus from './fixtures/monitor_status';
import monitorStatusById from './fixtures/monitor_status_by_id';

export default function ({ getService }) {
  describe('monitorStatusBar query', () => {
    const supertest = getService('supertest');

    it('returns the status for all monitors with no ID filtering', async () => {
      const getMonitorStatusBarQuery = {
        operationName: 'MonitorStatus',
        query: getMonitorStatusBarQueryString,
        variables: { dateRangeStart: 1547805782000, dateRangeEnd: 1547852582000 },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorStatusBarQuery });
      expect(data).to.eql(monitorStatus);
    });

    it('returns the status for only the given monitor', async () => {
      const getMonitorStatusBarQuery = {
        operationName: 'MonitorStatus',
        query: getMonitorStatusBarQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
          monitorId: 'http@http://www.google.com/',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorStatusBarQuery });
      expect(data).to.eql(monitorStatusById);
    });
  });
}
