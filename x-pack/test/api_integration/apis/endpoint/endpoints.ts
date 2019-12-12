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
    describe('POST /api/endpoint/endpoints', () => {
      it('endpoints should return one entry for each endpoint', async () => {
        await supertest
          .post('/api/endpoint/endpoints')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            expect(response.body.hits.total.value).to.eql(9);
            expect(response.body.hits.hits.length).to.eql(3);
            expect(response.body.aggregations.total.value).to.eql(3);
          });
      });
    });
    describe('GET /api/endpoint/endpoints/[machine_id]', () => {
      it('endpoints should return one entry for endpoint with machine id bbac0ffe-db76-4864-bb8c-13b46fa524c3', async () => {
        await supertest
          .get('/api/endpoint/endpoints/bbac0ffe-db76-4864-bb8c-13b46fa524c3')
          .set('kbn-xsrf', 'xxx')
          .send()
          .expect(200)
          .then((response: Record<string, any>) => {
            expect(response.body.hits.total.value).to.eql(3);
            expect(response.body.hits.hits.length).to.eql(1);
            expect(response.body.hits.hits[0]._source.machine_id).to.equal(
              'bbac0ffe-db76-4864-bb8c-13b46fa524c3'
            );
          });
      });
    });
  });
}
