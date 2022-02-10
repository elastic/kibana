/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectFixtureEql } from './helper/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';

export default function ({ getService }: FtrProviderContext) {
  describe('get monitor latest status API', () => {
    const dateStart = '2018-01-28T17:40:08.078Z';
    const dateEnd = '2025-01-28T19:00:16.078Z';
    const monitorId = '0002-up';

    const supertest = getService('supertest');

    it('returns the status for only the given monitor', async () => {
      const apiResponse = await supertest.get(API_URLS.MONITOR_STATUS).query({
        monitorId,
        dateStart,
        dateEnd,
      });
      expectFixtureEql(apiResponse.body, 'monitor_latest_status');
    });
  });
}
