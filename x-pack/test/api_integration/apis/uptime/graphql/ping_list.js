/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { pingsQueryString } from '../../../../../plugins/uptime/public/queries';
import pingList from './fixtures/ping_list';
import pingListCount from './fixtures/ping_list_count';
import pingListMonitorId from './fixtures/ping_list_monitor_id';
import pingListSort from './fixtures/ping_list_sort';

export default function ({ getService }) {
  describe('pingList query', () => {
    const supertest = getService('supertest');

    it('returns a list of pings for the given date range and default size', async () => {
      const getPingsQuery = {
        operationName: 'PingList',
        query: pingsQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingsQuery });
      const {
        allPings: { pings },
      } = data;
      expect(pings).length(10);
      expect(data).to.eql(pingList);
    });

    it('returns a list of pings for the date range and given size', async () => {
      const SIZE = 50;
      const getPingsQuery = {
        operationName: 'PingList',
        query: pingsQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          size: SIZE,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingsQuery });
      const {
        allPings: { pings },
      } = data;
      expect(pings).length(SIZE);
      expect(data).to.eql(pingListCount);
    });

    it('returns a list of pings for a monitor ID', async () => {
      const SIZE = 15;
      const MONITOR_ID = 'auto-tcp-0X81440A68E839814C';
      const getPingsQuery = {
        operationName: 'PingList',
        query: pingsQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          monitorId: MONITOR_ID,
          size: SIZE,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingsQuery });
      expect(data).to.eql(pingListMonitorId);
    });

    it('returns a list of pings sorted ascending', async () => {
      const SIZE = 5;
      const MONITOR_ID = 'auto-tcp-0X81440A68E839814C';
      const getPingsQuery = {
        operationName: 'PingList',
        query: pingsQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          monitorId: MONITOR_ID,
          size: SIZE,
          sort: 'asc',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingsQuery });
      expect(data).to.eql(pingListSort);
    });
  });
}
