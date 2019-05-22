/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import monitorList from './fixtures/monitor_list';
import monitorListDownFiltered from './fixtures/monitor_list_down_filtered';
import monitorListUpFiltered from './fixtures/monitor_list_up_filtered';
import { monitorListQueryString } from '../../../../../plugins/uptime/public/queries';

export default function ({ getService }) {
  describe('monitorList query', () => {
    const supertest = getService('supertest');

    it('will fetch a list of all the monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: monitorListQueryString,
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
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(monitorList);
    });

    it('will fetch a filtered list of all down monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: monitorListQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(monitorListDownFiltered);
    });

    it('will fetch a filtered list of all up monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: monitorListQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(monitorListUpFiltered);
    });

    // TODO: add filters for host and port
  });
}
