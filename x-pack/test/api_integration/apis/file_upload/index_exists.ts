/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('POST /internal/file_upload/index_exists', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('logstash_functional');
    });

    it('should return true when index exists', async () => {
      const resp = await supertest
        .post(`/internal/file_upload/index_exists`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'logstash-2015.09.22',
        })
        .expect(200);

      expect(resp.body.exists).to.be(true);
    });

    it('should return false when index does not exists', async () => {
      const resp = await supertest
        .post(`/internal/file_upload/index_exists`)
        .set('kbn-xsrf', 'kibana')
        .send({
          index: 'myNewIndex',
        })
        .expect(200);

      expect(resp.body.exists).to.be(false);
    });
  });
};
