/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  describe('`endpoint` test endpoints api', () => {
    before(() => esArchiver.load('endpoint/endpoints'));
    after(() => esArchiver.unload('endpoint/endpoints'));
    describe('GET /api/endpoint/endpoints', () => {
      it('endpoints api should return one entry for each endpoint with default paging', async () => {
        const { body } = await supertest
          .get('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(3);
        expect(body.endpoints.length).to.eql(3);
        expect(body.requestPageSize).to.eql(10);
        expect(body.requestIndex).to.eql(0);
      });

      it('endpoints api should return page based on params passed.', async () => {
        const { body } = await supertest
          .get('/api/endpoint/endpoints?pageSize=1&pageIndex=1')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200);
        expect(body.total).to.eql(3);
        expect(body.endpoints.length).to.eql(1);
        expect(body.requestPageSize).to.eql(1);
        expect(body.requestIndex).to.eql(1);
      });
    });
  });
}
