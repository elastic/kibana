/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from '../graphql/helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('snapshot count', () => {
    let dateRangeStart = '2019-01-28T17:40:08.078Z';
    let dateRangeEnd = '2025-01-28T19:00:16.078Z';

    it('snapshot count another', async () => {
      const res = await supertest.get(
        `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`
      );
      expectFixtureEql(res, 'snapshot');
    });

    it('will fetch a monitor snapshot filtered by down status', async () => {
      const filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`;
      const statusFilter = 'down';
      const res = await supertest.get(
        `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&filters=${filters}&statusFilter=${statusFilter}`
      );
      expectFixtureEql(res, 'snapshot_filtered_by_down');
    });

    it('will fetch a monitor snapshot filtered by up status', async () => {
      const filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"up","operator":"and"}}}]}}`;
      const statusFilter = 'up';
      const res = await supertest.get(
        `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&filters=${filters}&statusFilter=${statusFilter}`
      );
      expectFixtureEql(res, 'snapshot_filtered_by_up');
    });

    it('returns a null snapshot when no data is present', async () => {
      dateRangeStart = '2019-01-25T04:30:54.740Z';
      dateRangeEnd = '2025-01-28T04:50:54.740Z';
      const filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`;
      const res = await supertest.get(
        `/api/uptime/snapshot/count?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&filters=${filters}`
      );
      expectFixtureEql(res, 'snapshot_empty');
    });
  });
}
