/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { normalizeDataTypeDifferences } from '../normalize_data_type_differences';
import nodeDetailFixture from './fixtures/node_detail.json';
import nodeDetailAdvancedFixture from './fixtures/node_detail_advanced.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('node detail mb', () => {
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

    it('should summarize the Logstash node with non-advanced chart data metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/1rhApLfQShSh3JsNqYCkmA/logstash/node/838a2ada-1951-4043-8a23-4b450f6160a4'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, is_advanced: false })
        .expect(200);

      body.metrics = normalizeDataTypeDifferences(body.metrics, nodeDetailFixture);
      expect(body).to.eql(nodeDetailFixture);
    });

    it('should summarize the Logstash node with advanced chart data metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/1rhApLfQShSh3JsNqYCkmA/logstash/node/838a2ada-1951-4043-8a23-4b450f6160a4'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, is_advanced: true })
        .expect(200);

      body.metrics = normalizeDataTypeDifferences(body.metrics, nodeDetailAdvancedFixture);
      expect(body).to.eql(nodeDetailAdvancedFixture);
    });
  });
}
