/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from '../graphql/helpers/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  describe('get selected monitor by ID', () => {
    const monitorId = '0002-up';

    const supertest = getService('supertest');

    it('returns the monitor for give ID', async () => {
      const apiResponse = await supertest.get(
        `/api/uptime/monitor/selected?monitorId=${monitorId}`
      );
      expectFixtureEql(apiResponse.body, 'selected_monitor');
    });
  });
}
