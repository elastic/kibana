/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monitorStatesQueryString } from '../../../../../legacy/plugins/uptime/public/queries/monitor_states_query';
import { expectFixtureEql } from './expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  describe('monitorStates', () => {
    const supertest = getService('supertest');

    const getMonitorStates = async (variables: { [key: string]: any } = {}) => {
      const query = {
        operationName: 'MonitorStates',
        query: monitorStatesQueryString,
        variables: {
          dateRangeStart: '2019-09-11T03:31:04.380Z',
          dateRangeEnd: '2019-09-11T03:40:34.410Z',
          ...variables,
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...query });

      return data;
    };

    it('will fetch monitor state data for the given date range', async () => {
      expectFixtureEql(await getMonitorStates(), 'monitor_states');
    });

    it('will fetch monitor state data for the given filters and range', async () => {
      const data: any = await getMonitorStates({
        statusFilter: 'up',
        filters:
          '{"bool":{"must":[{"match":{"monitor.id":{"query":"0002-up","operator":"and"}}}]}}',
      });
      // await new Promise(r => setTimeout(r, 90000));
      expectFixtureEql(data, 'monitor_states_id_filtered');
    });

    it('can navigate forward and backward using pagination', async () => {
      const expectedResultsCount = 100;
      const expectedPageCount = expectedResultsCount / 10;

      let pagination: string | null = null;
      for (let page = 1; page <= expectedPageCount; page++) {
        const data: any = await getMonitorStates({ pagination });
        pagination = data.monitorStates.nextPagePagination;
        expectFixtureEql(data, `monitor_states_page_${page}`);

        // Test to see if the previous page pagination works on every page (other than the first)
        if (page > 1) {
          const prevData = await getMonitorStates({
            pagination: data.monitorStates.prevPagePagination,
          });
          expectFixtureEql(prevData, `monitor_states_page_${page}_previous`);
        }
      }
    });
  });
}
