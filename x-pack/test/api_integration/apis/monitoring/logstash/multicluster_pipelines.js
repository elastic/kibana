/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fixture from './fixtures/multicluster_pipelines';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  // FAILING: https://github.com/elastic/kibana/issues/52471
  describe.skip('pipelines listing multicluster', () => {
    const archive = 'monitoring/logstash_pipelines_multicluster';
    const timeRange = {
      min: '2019-11-11T15:13:45.266Z',
      max: '2019-11-11T15:17:05.399Z',
    };
    const pagination = {
      size: 10,
      index: 0,
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should get the pipelines', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/hJS0FZ7wR9GGdYs8RNW8pw/logstash/pipelines')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, pagination })
        .expect(200);

      expect(body).to.eql(fixture);
    });
  });
}
