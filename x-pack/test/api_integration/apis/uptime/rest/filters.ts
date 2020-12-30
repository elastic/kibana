/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { expectFixtureEql } from './helper/expect_fixture_eql';
import { FtrProviderContext } from '../../../ftr_provider_context';

const getApiPath = (dateRangeStart: string, dateRangeEnd: string, filters?: string) =>
  `/api/uptime/filters?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}${
    filters ? `&filters=${filters}` : ''
  }`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('filter group endpoint', () => {
    const dateRangeStart = '2019-01-28T17:40:08.078Z';
    const dateRangeEnd = '2025-01-28T19:00:16.078Z';

    it('returns expected filters', async () => {
      const resp = await supertest.get(getApiPath(dateRangeStart, dateRangeEnd));
      expectFixtureEql(resp.body, 'filters');
    });
  });
}
