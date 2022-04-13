/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import nodesFixture from './fixtures/nodes';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('node listing mb', () => {
    const archive = 'x-pack/test/functional/es_archives/monitoring/logstash_pipelines_mb';
    const timeRange = {
      min: '2018-01-22T09:33:13.000Z',
      max: '2018-01-22T09:41:04.000Z',
    };

    before('load archive', () => {
      return setup(archive);
    });

    after('unload archive', () => {
      return tearDown();
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
