/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ipToHostNameTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('Ip to Host API', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should basically work', async () => {
      const postBody = {
        index_pattern: 'metricbeat-*',
        ip: '10.128.0.7',
      };
      const response = await supertest
        .post('/api/infra/ip_to_host')
        .set('kbn-xsrf', 'xxx')
        .send(postBody)
        .expect(200);

      expect(response.body).to.have.property('host', 'demo-stack-mysql-01');
    });

    it('should return 404 for invalid ip', async () => {
      const postBody = {
        index_pattern: 'metricbeat-*',
        ip: '192.168.1.1',
      };
      return supertest
        .post('/api/infra/ip_to_host')
        .set('kbn-xsrf', 'xxx')
        .send(postBody)
        .expect(404);
    });
  });
}
