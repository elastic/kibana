/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import nonSystemIndicesResponse from '../../fixtures/elasticsearch/indices_no_system.json';
import allIndicesResponse from '../../fixtures/elasticsearch/indices_all.json';
import indexDetailResponse from '../../fixtures/elasticsearch/index_detail.json';
import indexDetailAdvancedResponse from '../../fixtures/elasticsearch/index_detail_advanced.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Indices',
    archiveRoot: 'x-pack/test/monitoring_api_integration/archives/elasticsearch/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-01-24T15:45:30.000Z',
    max: '2023-01-24T15:51:30.000Z',
  };

  testRunner(() => {
    it('should summarize the non-system indices with stats', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch/indices?show_system_indices=false'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(nonSystemIndicesResponse);
    });

    it('should summarize all indices with stats', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch/indices?show_system_indices=true'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(allIndicesResponse);
    });

    it('should summarize index with chart metrics data for the non-advanced view', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch/indices/.ds-metrics-elasticsearch.stack_monitoring.cluster_stats-default-2023.01.24-000001'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
          is_advanced: false,
        })
        .expect(200);

      expect(body).to.eql(indexDetailResponse);
    });

    it('should summarize index with chart metrics data for the advanced view', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/-8HHufEtS72rt344JzYofg/elasticsearch/indices/.ds-metrics-elasticsearch.stack_monitoring.cluster_stats-default-2023.01.24-000001'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
          is_advanced: true,
        })
        .expect(200);

      expect(body).to.eql(indexDetailAdvancedResponse);
    });
  });
}
