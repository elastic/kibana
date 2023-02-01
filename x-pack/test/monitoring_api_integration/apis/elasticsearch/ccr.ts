/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import ccrResponse from '../../fixtures/elasticsearch/ccr.json';
import ccrShardResponse from '../../fixtures/elasticsearch/ccr_shard.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'CCR',
    archiveRoot: 'x-pack/test/monitoring_api_integration/archives/elasticsearch/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-01-24T15:45:30.000Z',
    max: '2023-01-24T15:51:30.000Z',
  };

  testRunner(() => {
    it('should return all followers and a grouping of stats by follower index', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch/ccr')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(ccrResponse);
    });

    it('should return an empty list of followers if the cluster_uuid does not have any match', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/random_uuid/elasticsearch/ccr')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql([]);
    });

    it('should return specific shard details', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch/ccr/foo-follower/shard/0'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(ccrShardResponse);
    });
  });
}
