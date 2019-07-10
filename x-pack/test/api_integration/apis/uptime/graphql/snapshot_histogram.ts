/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { snapshotHistogramQueryString } from '../../../../../legacy/plugins/uptime/public/queries/snapshot_histogram_query';
import snapshotHistogram from './fixtures/snapshot_histogram.json';
import snapshotHistogramById from './fixtures/snapshot_histogram_by_id.json';
import snapshotHistogramByFilter from './fixtures/snapshot_histogram_by_filter.json';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: { getService: any }) {
  describe('snapshotHistogram', () => {
    const supertest = getService('supertest');

    it('will fetch histogram data for all monitors', async () => {
      const getSnapshotHistogramQuery = {
        operationName: 'SnapshotHistogram',
        query: snapshotHistogramQueryString,
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
        .send({ ...getSnapshotHistogramQuery });

      expect(data).to.eql(snapshotHistogram);
    });

    it('will fetch histogram data for a given monitor id', async () => {
      const getSnapshotHistogramQuery = {
        operationName: 'SnapshotHistogram',
        query: snapshotHistogramQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          monitorId: 'auto-http-0XDD2D4E60FD4A61C3',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotHistogramQuery });

      expect(data).to.eql(snapshotHistogramById);
    });

    it('will fetch histogram data for a given filter', async () => {
      const getSnapshotHistogramQuery = {
        operationName: 'SnapshotHistogram',
        query: snapshotHistogramQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters:
            '{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getSnapshotHistogramQuery });

      expect(data).to.eql(snapshotHistogramByFilter);
    });
  });
}
