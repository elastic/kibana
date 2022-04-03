/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { expectFixtureEql } from './helper/expect_fixture_eql';
import { API_URLS } from '../../../../../plugins/synthetics/common/constants';

export default function ({ getService }: FtrProviderContext) {
  describe('docCount query', () => {
    const supertest = getService('supertest');

    it(`will fetch the index's count`, async () => {
      const apiResponse = await supertest.get(API_URLS.INDEX_STATUS);
      const data = apiResponse.body;
      expectFixtureEql(data, 'doc_count');
    });
  });
}
