/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import monitorList from './fixtures/monitor_list';
import downFiltered from './fixtures/down_filtered';
import upFiltered from './fixtures/up_filtered';
import { getMonitorListQueryString } from '../../../../../plugins/uptime/public/components/queries/monitor_list/get_monitor_list';

export default function ({ getService }) {
  describe('monitorList query', () => {
    const supertest = getService('supertest');

    it('will fetch a list of all the monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: getMonitorListQueryString,
        variables: { dateRangeStart: 1547805782000, dateRangeEnd: 1547852582000 },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(monitorList);
    });

    it('will fetch a filtered list of all down monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: getMonitorListQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(downFiltered);
    });

    it('will fetch a filtered list of all up monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: getMonitorListQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(upFiltered);
    });

    // TODO: add filters for host and port
  });
}
