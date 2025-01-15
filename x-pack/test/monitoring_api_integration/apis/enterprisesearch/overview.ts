/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import response from '../../fixtures/enterprisesearch/overview.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Overview',
    archiveRoot: 'x-pack/test/monitoring_api_integration/archives/enterprisesearch',
    getService,
  });

  const timeRange = {
    min: '2023-01-11T20:54:00.000Z',
    max: '2023-01-11T21:01:00.000Z',
  };

  testRunner(() => {
    it('should summarize enterprisesearch cluster with metrics', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/FDTNEesSQ7GbzOXIO9qImw/enterprise_search')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(response);
    });
  });
}
