/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
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
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
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
      expect({ monitorStatus: responseData.map(status => omit(status, 'millisFromNow')) }).to.eql(
        monitorStatus
      );
    });

    it('returns the status for only the given monitor', async () => {
      const getMonitorStatusBarQuery = {
        operationName: 'MonitorStatus',
        query: getMonitorStatusBarQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          monitorId: 'auto-tcp-0X81440A68E839814C',
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
      expect({ monitorStatus: responseData.map(status => omit(status, 'millisFromNow')) }).to.eql(
        monitorStatusById
      );
    });
  });
}
