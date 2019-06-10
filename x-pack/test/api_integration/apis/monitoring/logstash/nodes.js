/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import nodesFixture from './fixtures/nodes';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('node listing', () => {
    const archive = 'monitoring/logstash-pipelines';
    const timeRange = {
      min: '2018-01-22T09:33:13.000Z',
      max: '2018-01-22T09:41:04.000Z'
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should summarize the Logstash nodes with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/1rhApLfQShSh3JsNqYCkmA/logstash/nodes')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(nodesFixture);
    });
  });
}
