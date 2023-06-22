/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getTestRunner } from '../../utils/test_runner';

import response from '../../fixtures/beats/beats.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const testRunner = getTestRunner({
    testName: 'Beats',
    archiveRoot: 'x-pack/test/monitoring_api_integration/archives/beats',
    getService,
  });

  const timeRange = {
    min: '2022-12-20T17:19:00.000Z',
    max: '2022-12-20T17:22:00.000Z',
  };

  testRunner(() => {
    it('should load beats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/3_pOMySBSkCwdyxxBdDbvA/beats/beats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(response);
    });
  });
}
