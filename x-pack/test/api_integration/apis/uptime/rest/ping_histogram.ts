/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from '../graphql/helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { assertCloseTo } from '../../../../../legacy/plugins/uptime/server/lib/helper';

export default function({ getService }: FtrProviderContext) {
  describe('pingHistogram', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    const supertest = getService('supertest');

    it('will fetch histogram data for all monitors', async () => {
      const getPingHistogramQuery = {
        operationName: 'PingHistogram',
        query: pingHistogramQueryString,
        variables: {
          dateRangeStart: '2019-09-11T03:31:04.380Z',
          dateRangeEnd: '2019-09-11T03:40:34.410Z',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingHistogramQuery });
      // manually testing this value and then removing it to avoid flakiness
      const { interval } = data.queryResult;
      assertCloseTo(interval, 22801, 100);
      delete data.queryResult.interval;
      expectFixtureEql(data, 'ping_histogram');
    });

    it('will fetch histogram data for a given monitor id', async () => {
      const getPingHistogramQuery = {
        operationName: 'PingHistogram',
        query: pingHistogramQueryString,
        variables: {
          dateRangeStart: '2019-09-11T03:31:04.380Z',
          dateRangeEnd: '2019-09-11T03:40:34.410Z',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingHistogramQuery });
      const { interval } = data.queryResult;
      assertCloseTo(interval, 22801, 100);
      delete data.queryResult.interval;
      expectFixtureEql(data, 'ping_histogram_by_id');
    });

    it('will fetch histogram data for a given filter', async () => {
      const getPingHistogramQuery = {
        operationName: 'PingHistogram',
        query: pingHistogramQueryString,
        variables: {
          dateRangeStart: '2019-09-11T03:31:04.380Z',
          dateRangeEnd: '2019-09-11T03:40:34.410Z',
          filters:
            '{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getPingHistogramQuery });
      const { interval } = data.queryResult;
      assertCloseTo(interval, 22801, 100);
      delete data.queryResult.interval;
      expectFixtureEql(data, 'ping_histogram_by_filter');
    });
  });
}
