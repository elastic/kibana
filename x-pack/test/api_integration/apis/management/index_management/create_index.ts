/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { INTERNAL_API_BASE_PATH } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('create index', async () => {
    const testIndices = ['my-test-index-001', 'my-test-index-002'];
    before(async () => {
      await esDeleteAllIndices(testIndices);
    });
    after(async () => {
      await esDeleteAllIndices(testIndices);
    });

    it('can create an index', async () => {
      const indexName = testIndices[0];
      await supertest
        .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
        .set('kbn-xsrf', 'xxx')
        .send({
          indexName,
        })
        .expect(200);

      // Make sure the index is created
      const {
        body: [cat1],
      } = await es.cat.indices({ index: indexName, format: 'json' }, { meta: true });
      expect(cat1.status).to.be('open');
    });

    it(`throws 400 when index already created`, async () => {
      const indexName = testIndices[1];
      await supertest
        .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
        .set('kbn-xsrf', 'xxx')
        .send({
          indexName,
        })
        .expect(200);

      // Make sure the index is created
      const {
        body: [cat1],
      } = await es.cat.indices({ index: indexName, format: 'json' }, { meta: true });
      expect(cat1.status).to.be('open');

      await supertest
        .put(`${INTERNAL_API_BASE_PATH}/indices/create`)
        .set('kbn-xsrf', 'xxx')
        .send({
          indexName,
        })
        .expect(400);
    });
  });
}
