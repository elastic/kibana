/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from '../graphql/helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('pingList query', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    it('returns a list of pings for the given date range and default size', async () => {
      const dateRangeStart = '2019-01-28T17:40:08.078Z';
      const dateRangeEnd = '2025-01-28T19:00:16.078Z';

      const apiResponse = await supertest.get(
        `/api/uptime/pings?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`
      );

      expectFixtureEql(apiResponse.body, 'ping_list');
    });

    it('returns a list of pings for the date range and given size', async () => {
      const dateRangeStart = '2019-01-28T17:40:08.078Z';
      const dateRangeEnd = '2025-01-28T19:00:16.078Z';
      const size = 50;

      const apiResponse = await supertest.get(
        `/api/uptime/pings?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&size=${size}`
      );

      expectFixtureEql(apiResponse.body, 'ping_list_count');
    });

    it('returns a list of pings for a monitor ID', async () => {
      const dateRangeStart = '2019-01-28T17:40:08.078Z';
      const dateRangeEnd = '2025-01-28T19:00:16.078Z';
      const monitorId = '0001-up';
      const size = 15;

      const apiResponse = await supertest.get(
        `/api/uptime/pings?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&monitorId=${monitorId}&size=${size}`
      );

      expectFixtureEql(apiResponse.body, 'ping_list_monitor_id');
    });

    it('returns a list of pings sorted ascending', async () => {
      const dateRangeStart = '2019-01-28T17:40:08.078Z';
      const dateRangeEnd = '2025-01-28T19:00:16.078Z';
      const monitorId = '0001-up';
      const size = 5;
      const sort = 'asc';

      const apiResponse = await supertest.get(
        `/api/uptime/pings?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}&monitorId=${monitorId}&size=${size}&sort=${sort}`
      );

      expectFixtureEql(apiResponse.body, 'ping_list_sort');
    });
  });
}
