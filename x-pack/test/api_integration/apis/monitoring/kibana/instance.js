/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import instanceFixture from './fixtures/instance.json';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('instance detail', () => {
    const archive = 'x-pack/test/functional/es_archives/monitoring/singlecluster_yellow_platinum';
    const timeRange = {
      min: '2017-08-29T17:24:17.000Z',
      max: '2017-08-29T17:26:08.000Z',
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should summarize single kibana instance with metrics', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/DFDDUmKHR0Ge0mkdYW2bew/kibana/de3b8f2a-7bb9-4931-9bf3-997ba7824cf9'
        )
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(instanceFixture);
    });
  });
}
