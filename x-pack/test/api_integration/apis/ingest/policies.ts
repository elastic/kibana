/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  function useFixtures() {
    before(async () => {
      await esArchiver.loadIfNeeded('ingest/policies');
    });
    after(async () => {
      await esArchiver.unload('ingest/policies');
    });
  }

  describe('ingest_policies', () => {
    describe('POST /api/ingest/policies', () => {
      useFixtures();

      it('should return a 400 if the request is not valid', async () => {
        await supertest
          .post(`/api/ingest/policies`)
          .set('kbn-xsrf', 'xxx')
          .send({})
          .expect(400);
      });

      it('should allow to create a new policy', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest/policies`)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: 'Policy from test 1',
            description: 'I am a policy',
          })
          .expect(200);

        expect(apiResponse.success).to.eql(true);
        expect(apiResponse).to.have.keys('success', 'item', 'action');
        expect(apiResponse.item).to.have.keys(
          'id',
          'shared_id',
          'version',
          'name',
          'status',
          'description'
        );
      });
    });
    describe('GET /api/ingest/policies', () => {
      useFixtures();
      it('should return the list of policies grouped by shared id', async () => {
        const { body: apiResponse } = await supertest.get(`/api/ingest/policies`).expect(200);
        expect(apiResponse).to.have.keys('success', 'page', 'total', 'list');
        expect(apiResponse.success).to.eql(true);
        const policiesIds = (apiResponse.list as Array<{ id: string }>).map(i => i.id);
        expect(policiesIds.length).to.eql(2);
        expect(policiesIds).to.contain('1');
        expect(policiesIds).to.contain('3');
      });
    });
  });
}
