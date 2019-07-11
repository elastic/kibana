/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { monitorStatesQueryString } from '../../../../../legacy/plugins/uptime/public/queries/monitor_states_query';
import monitorStates from './fixtures/monitor_states.json';
import monitorStatesIdFiltered from './fixtures/monitor_states_id_filtered.json';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: { getService: any }) {
  describe('monitorStates', () => {
    const supertest = getService('supertest');

    it('will fetch monitor state data for the given date range', async () => {
      const getMonitorStatesQuery = {
        operationName: 'MonitorStates',
        query: monitorStatesQueryString,
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
        .send({ ...getMonitorStatesQuery });

      expect(data).to.eql(monitorStates);
    });

    it('will fetch monitor state data for the given filters and range', async () => {
      const getMonitorStatesQuery = {
        operationName: 'MonitorStates',
        query: monitorStatesQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters:
            '{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}},{"match":{"monitor.id":{"query":"auto-http-0XDD2D4E60FD4A61C3","operator":"and"}}}]}}',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorStatesQuery });

      expect(data).to.eql(monitorStatesIdFiltered);
    });
  });
}
