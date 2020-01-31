/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { snapshotQueryString } from '../../../../../legacy/plugins/uptime/public/queries';
import { expectFixtureEql } from './helpers/expect_fixture_eql';

export default function({ getService }) {
  describe('snapshot query', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    const supertest = getService('supertest');

    it('will fetch a monitor snapshot summary', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: snapshotQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotQuery });

      expectFixtureEql(data, 'snapshot');
    });

    it('will fetch a monitor snapshot filtered by down status', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: snapshotQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`,
          statusFilter: 'down',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotQuery });

      expectFixtureEql(data, 'snapshot_filtered_by_down');
    });

    it('will fetch a monitor snapshot filtered by up status', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: snapshotQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2025-01-28T19:00:16.078Z',
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}`,
          statusFilter: 'up',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotQuery });

      expectFixtureEql(data, 'snapshot_filtered_by_up');
    });

    it('returns null histogram data when no data present', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: snapshotQueryString,
        variables: {
          dateRangeStart: '2019-01-25T04:30:54.740Z',
          dateRangeEnd: '2025-01-28T04:50:54.740Z',
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotQuery });

      expectFixtureEql(data, 'snapshot_empty');
    });
    // TODO: test for host, port, etc.
  });
}
