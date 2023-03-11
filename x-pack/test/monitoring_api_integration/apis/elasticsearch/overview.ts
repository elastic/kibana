/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import overviewResponse from '../../fixtures/elasticsearch/overview.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Overview',
    archiveRoot: 'x-pack/test/monitoring_api_integration/archives/elasticsearch/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-01-24T15:45:30.000Z',
    max: '2023-01-24T15:51:30.000Z',
  };

  testRunner(() => {
    it('should summarize elasticsearch with metrics', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch')
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
        })
        .expect(200);

      expect(body).to.eql(overviewResponse);
    });
  });
}
