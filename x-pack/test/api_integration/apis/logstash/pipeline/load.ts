/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

import pipeline from './fixtures/load.json';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  describe('list', () => {
    const archive = 'logstash/example_pipelines';

    before('load pipelines archive', () => {
      return esArchiver.load(archive);
    });

    after('unload pipelines archive', () => {
      return esArchiver.unload(archive);
    });

    it('should return the specified pipeline', async () => {
      const { body } = await supertest.get('/api/logstash/pipeline/tweets_and_beats').expect(200);

      expect(body).to.eql(pipeline);
    });
  });
}
