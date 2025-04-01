/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import clusterOverviewResponse from '../../fixtures/kibana/cluster_overview.json';
import kibanaOverviewResponse from '../../fixtures/kibana/kibana_overview.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Overview',
    archiveRoot: 'x-pack/test/monitoring_api_integration/archives/kibana/single_node',
    getService,
  });

  const timeRange = {
    min: '2023-03-14T12:53:50.000Z',
    max: '2023-03-14T13:03:30.000Z',
  };

  testRunner(() => {
    // FLAKY: https://github.com/elastic/kibana/issues/184853
    it.skip('should get kibana rules at cluster level', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/rSEDbJNIQmOE-v9n2rV5cA')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, codePaths: ['all'] })
        .expect(200);

      expect(body[0].kibana.rules).to.eql(clusterOverviewResponse[0].kibana.rules);
    });

    it('should summarize kibana instances with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/rSEDbJNIQmOE-v9n2rV5cA/kibana')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(kibanaOverviewResponse);
    });
  });
}
