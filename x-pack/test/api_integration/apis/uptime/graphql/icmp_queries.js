/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import monitorList from './fixtures/icmp_monitor_list';
import monitorListFiltered from './fixtures/icmp_monitor_list_filtered';
import icmpFilterList from './fixtures/icmp_filter_list';
import { getFilterBarQueryString } from '../../../../../plugins/uptime/public/components/queries/filter_bar/get_filter_bar';
import { getMonitorListQueryString } from '../../../../../plugins/uptime/public/components/queries/monitor_list/get_monitor_list';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const icmpArchive = 'uptime/icmp_docs';
  describe('uptime API with ICMP documents', () => {
    before('unload non-icmp index', async () => {
      await esArchiver.load(icmpArchive);
    });
    after('re-load non-icmp index', async () => {
      await esArchiver.unload(icmpArchive);
    });

    it('will return a list of monitors including icmp-type', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: getMonitorListQueryString,
        variables: {
          dateRangeStart: 1551763670000,
          dateRangeEnd: 1551821270000,
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

    it('will return a list of only icmp-type monitors', async () => {
      const getMonitorListQuery = {
        operationName: 'MonitorList',
        query: getMonitorListQueryString,
        variables: {
          dateRangeStart: 1551763670000,
          dateRangeEnd: 1551821270000,
          filters: `{"bool":{"must":[{"match":{"monitor.type":{"query":"icmp","operator":"and"}}}]}}`,
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorListQuery });
      expect(data).to.eql(monitorListFiltered);
    });

    it('will return a list of all available filter options for monitor type', async () => {
      const getFilterBarQuery = {
        operationName: 'FilterBar',
        query: getFilterBarQueryString,
        variables: { dateRangeStart: 1541821270000, dateRangeEnd: 1551821270000 },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getFilterBarQuery });
      expect(data).to.eql(icmpFilterList);
    });
  });
}
