/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getSnapshotQueryString } from '../../../../../plugins/uptime/public/components/queries/snapshot/get_snapshot';
import snapshot from './fixtures/snapshot';
import snapshotFilteredByDown from './fixtures/snapshot_filtered_by_down';
import snapshotFilteredByUp from './fixtures/snapshot_filtered_by_up';
import snapshotEmpty from './fixtures/snapshot_empty';

export default function ({ getService }) {
  describe('snapshot query', () => {
    const supertest = getService('supertest');

    it('will fetch a monitor snapshot summary', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: getSnapshotQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotQuery });
      expect(data).to.eql(snapshot);
    });

    it('will fetch a monitor snapshot filtered by down status', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: getSnapshotQueryString,
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
        .send({ ...getSnapshotQuery });
      expect(data).to.eql(snapshotFilteredByDown);
    });

    it('will fetch a monitor snapshot filtered by up status', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: getSnapshotQueryString,
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
        .send({ ...getSnapshotQuery });
      expect(data).to.eql(snapshotFilteredByUp);
    });

    it('returns null histogram data when no data present', async () => {
      const getSnapshotQuery = {
        operationName: 'Snapshot',
        query: getSnapshotQueryString,
        variables: {
          dateRangeStart: 1227800782000,
          dateRangeEnd: 1227950582000,
          filters: `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotQuery });
      expect(data).to.eql(snapshotEmpty);
    });
    // TODO: test for host, port, etc.
  });
}
